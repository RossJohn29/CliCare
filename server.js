// server.js new
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const nodemailer = require('nodemailer');
const axios = require('axios');
const QRCode = require('qrcode');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuration
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
};

const ITEXMO_CONFIG = {
  apiKey: process.env.ITEXMO_API_KEY,
  senderId: process.env.ITEXMO_SENDER_ID || 'CLICARE',
  apiUrl: 'https://www.itexmo.com/php_api/api.php'
};

const isSMSConfigured = ITEXMO_CONFIG.apiKey && ITEXMO_CONFIG.apiKey !== 'PR-SAMPL123456_ABCDE';

// In-Memory Store for Rate Limiting
const failedAttempts = new Map();

// Rate Limiting Functions
const checkAccountRateLimit = (identifier) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;

  if (!failedAttempts.has(identifier)) {
    failedAttempts.set(identifier, []);
  }

  const attempts = failedAttempts.get(identifier);
  const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
  failedAttempts.set(identifier, recentAttempts);

  if (recentAttempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...recentAttempts);
    const timeLeft = windowMs - (now - oldestAttempt);
    const minutesLeft = Math.ceil(timeLeft / 60000);
    
    throw new Error(`Too many failed login attempts for this account. Try again in ${minutesLeft} minutes.`);
  }
};

const recordFailedAttempt = (identifier) => {
  if (!failedAttempts.has(identifier)) {
    failedAttempts.set(identifier, []);
  }
  
  const attempts = failedAttempts.get(identifier);
  attempts.push(Date.now());
  failedAttempts.set(identifier, attempts);
};

const clearFailedAttempts = (identifier) => {
  failedAttempts.delete(identifier);
};

// Utility Functions
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const assignDepartmentBySymptoms = async (symptoms, patientAge = null) => {
  try {
    const { data: mappings, error } = await supabase
      .from('symptom_department')
      .select('symptom_name, department_id, priority, age_min, age_max')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error fetching symptom mappings:', error);
      return 2; // Fallback to Internal Medicine
    }

    // Find best matching department
    for (const symptom of symptoms) {
      const matches = mappings.filter(mapping => 
        mapping.symptom_name === symptom &&
        (patientAge === null || 
        (patientAge >= mapping.age_min && patientAge <= mapping.age_max))
      );
      
      if (matches.length > 0) {
        return matches[0].department_id;
      }
    }
    
    return 2; // Default to Internal Medicine
  } catch (error) {
    console.error('Error in symptom mapping:', error);
    return 2; // Fallback to Internal Medicine
  }
};

// Email Service
const sendEmailOTP = async (email, otp, patientName) => {
  try {
    const transporter = nodemailer.createTransport(emailConfig);
    await transporter.verify();
  
    const mailOptions = {
      from: emailConfig.auth.user,
      to: email,
      subject: 'CLICARE - Your Verification Code',
      html: `
        <div style="font-family: Poppins, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🏥 CliCare Verification Code</h2>
          <p>Hello ${patientName},</p>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
            ${otp}
          </div>
          <p><strong>This code will expire in 5 minutes.</strong></p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr>
          <p><small>CliCare Hospital Management System</small></p>
        </div>
      `
    };


    const result = await transporter.sendMail(mailOptions);
    return result;
  
  } catch (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// SMS Service
const sendSMSOTP = async (phoneNumber, otp, patientName) => {
  try {
    if (!isSMSConfigured) {
      throw new Error('SMS service not configured. Please contact administrator.');
    }
    
    let formattedPhone = phoneNumber.toString().trim();
    
    if (formattedPhone.startsWith('+639')) {
      formattedPhone = '0' + formattedPhone.substring(3);
    } else if (formattedPhone.startsWith('639')) {
      formattedPhone = '0' + formattedPhone.substring(2);
    }
    
    if (!/^09\d{9}$/.test(formattedPhone)) {
      throw new Error('Invalid Philippine mobile number format');
    }
    
    const message = `CLICARE: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code.`;
    
    const params = {
      '1': formattedPhone,
      '2': message,
      '3': ITEXMO_CONFIG.apiKey,
      passwd: ITEXMO_CONFIG.apiKey.split('_')[1] || 'default'
    };
    
    const response = await axios.post(ITEXMO_CONFIG.apiUrl, new URLSearchParams(params), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 30000
    });
    
    if (response.data && response.data.toString().trim() === '0') {
      return {
        success: true,
        messageId: 'itexmo_' + Date.now(),
        provider: 'iTexMo'
      };
    } else {
      const errorCodes = {
        '1': 'Incomplete parameters',
        '2': 'Invalid number',
        '3': 'Invalid API key',
        '4': 'Maximum SMS per day reached',
        '5': 'Maximum SMS per hour reached',
        '10': 'Duplicate message',
        '15': 'Invalid message',
        '16': 'SMS contains spam words'
      };
      
      const errorCode = response.data.toString().trim();
      const errorMessage = errorCodes[errorCode] || `Unknown error (${errorCode})`;
      
      throw new Error(`SMS sending failed: ${errorMessage}`);
    }
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('SMS service timeout. Please try again.');
    } else if (error.response) {
      throw new Error(`SMS service error: ${error.response.data || error.response.status}`);
    } else if (error.message.includes('Network Error')) {
      throw new Error('Network error. Please check your internet connection.');
    } else {
      throw new Error(error.message || 'Failed to send SMS');
    }
  }
};

const hasOnlyRoutineCareSymptoms = (symptoms) => {
  const routineCareSymptoms = [
    'Annual Check-up',
    'Health Screening', 
    'Vaccination',
    'Physical Exam',
    'Blood Pressure Check',
    'Cholesterol Screening',
    'Diabetes Screening',
    'Cancer Screening'
  ];
  
  if (!symptoms || symptoms.length === 0) return false;
  
  const symptomsList = Array.isArray(symptoms) ? symptoms : symptoms.split(', ');
  
  return symptomsList.every(symptom => routineCareSymptoms.includes(symptom.trim()));
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads', 'lab-results');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed!'));
    }
  }
});

const uploadDir = path.join(__dirname, 'uploads', 'lab-results');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-frontend-domain.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'file://', '*'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiters
const generalLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    error: 'Too many requests from this network. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Healthcare Provider Login
app.post('/api/staff/login', generalLoginLimiter, async (req, res) => {
  try {
    const { staffId, password } = req.body;

    if (!staffId || !password) {
      return res.status(400).json({
        error: 'Staff ID and password are required'
      });
    }

    try {
      checkAccountRateLimit(`healthcare:${staffId.toLowerCase()}`);
    } catch (rateLimitError) {
      return res.status(429).json({
        error: rateLimitError.message
      });
    }

    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('staff_id', staffId)
      .single();

    if (staffError || !staffData) {
      recordFailedAttempt(`healthcare:${staffId.toLowerCase()}`);
      return res.status(404).json({
        error: 'Healthcare Provider ID not found'
      });
    }

    let isValidPassword = false;
    
    if (staffData.password === password) {
      isValidPassword = true;
    } else {
      try {
        isValidPassword = await verifyPassword(password, staffData.password);
      } catch (error) {
        console.log('Bcrypt comparison failed:', error.message);
      }
    }
    
    if (!isValidPassword) {
      recordFailedAttempt(`healthcare:${staffId.toLowerCase()}`);
      return res.status(401).json({
        error: 'Incorrect password'
      });
    }

    clearFailedAttempts(`healthcare:${staffId.toLowerCase()}`);

    const token = jwt.sign(
      {
        id: staffData.id,
        staff_id: staffData.staff_id,
        name: staffData.name,
        role: staffData.role,
        specialization: staffData.specialization,
        department_id: staffData.department_id,
        type: 'healthcare'
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await supabase
        .from('staff')
        .update({
          is_online: true,
          last_login: new Date().toISOString(),
          last_activity: new Date().toISOString()
        })
        .eq('id', staffData.id);

    const { password: _, ...staffInfo } = staffData;
    
    res.status(200).json({
      success: true,
      token,
      staff: staffInfo,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Healthcare login error:', error);
    res.status(500).json({
      error: 'Internal server error during login'
    });
  }
});

// Admin Login
app.post('/api/admin/login', generalLoginLimiter, async (req, res) => {
  try {
    const { healthadminid, password } = req.body;

    if (!healthadminid || !password) {
      return res.status(400).json({
        error: 'Admin ID and password are required'
      });
    }

    try {
      checkAccountRateLimit(`admin:${healthadminid.toLowerCase()}`);
    } catch (rateLimitError) {
      return res.status(429).json({
        error: rateLimitError.message
      });
    }

    const { data: adminData, error: adminError } = await supabase
      .from('admin')
      .select('*')
      .eq('healthadmin_id', healthadminid)
      .single();

    if (adminError || !adminData) {
      recordFailedAttempt(`admin:${healthadminid.toLowerCase()}`);
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    let isValidPassword = false;
    
    if (adminData.password === password) {
      isValidPassword = true;
    } else {
      try {
        isValidPassword = await verifyPassword(password, adminData.password);
      } catch (error) {
        console.log('Bcrypt comparison failed:', error.message);
      }
    }
    
    if (!isValidPassword) {
      recordFailedAttempt(`admin:${healthadminid.toLowerCase()}`);
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    clearFailedAttempts(`admin:${healthadminid.toLowerCase()}`);

    const token = jwt.sign(
      {
        id: adminData.id,
        healthadmin_id: adminData.healthadmin_id,
        name: adminData.name,
        position: adminData.position,
        type: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const { password: _, ...adminInfo } = adminData;
    
    res.status(200).json({
      success: true,
      token,
      admin: adminInfo,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      error: 'Internal server error during login'
    });
  }
});

// Add these endpoints to your existing server.js

// Get time slots
app.get('/api/time-slots', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('is_active', true)
      .order('slot_id');

    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch time slots' });
  }
});

// Get relationships
app.get('/api/relationships', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('relationship_types')
      .select('*')
      .eq('is_active', true)
      .order('id');

    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch relationships' });
  }
});

// Get severity levels
app.get('/api/severity-levels', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('severity_levels')
      .select('*')
      .eq('is_active', true)
      .order('id');

    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch severity levels' });
  }
});

// Get duration options
app.get('/api/duration-options', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('duration_options')
      .select('*')
      .eq('is_active', true)
      .order('id');

    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch duration options' });
  }
});

// Get symptom-department mapping
app.get('/api/symptom-department-mapping', async (req, res) => {
  try {
    const { data: mappings, error } = await supabase
      .from('symptom_department')
      .select(`
        symptom_name,
        department_id,
        priority,
        age_min,
        age_max,
        conditions,
        department!inner(name)
      `)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      mappings: mappings || []
    });
  } catch (error) {
    console.error('Error fetching symptom mappings:', error);
    res.status(500).json({ error: 'Failed to fetch symptom mappings' });
  }
});

// Get navigation steps for a department
app.get('/api/navigation-steps/:departmentId', async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    // Get department info WITH floor plan image
    const { data: department, error: deptError } = await supabase
      .from('department')
      .select('department_id, name, floor_plan_image, floor_plan_image_type')
      .eq('department_id', departmentId)
      .single();

    if (deptError) throw deptError;

    // Get navigation steps
    const { data: steps, error: stepsError } = await supabase
      .from('navigation_steps')
      .select('*')
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .order('step_order', { ascending: true });

    if (stepsError) throw stepsError;

    // Format floor plan image as data URL
    const floorPlanUrl = department.floor_plan_image 
      ? `data:image/${department.floor_plan_image_type};base64,${department.floor_plan_image}`
      : null;

    res.json({
      success: true,
      departmentName: department.name,
      floorPlanImage: floorPlanUrl, // ONE image for entire route
      steps: steps || []
    });

  } catch (error) {
    console.error('Error fetching navigation steps:', error);
    res.status(500).json({ error: 'Failed to fetch navigation steps' });
  }
});

// Get navigation steps by department name (for printingService)
app.get('/api/navigation-steps-by-name/:departmentName', async (req, res) => {
  try {
    const { departmentName } = req.params;
    
    const { data: steps, error } = await supabase
      .from('navigation_steps')
      .select(`
        step_order,
        location_name,
        description,
        floor_number,
        room_numbers,
        department!inner(name)
      `)
      .eq('department.name', departmentName)
      .eq('is_active', true)
      .order('step_order', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      steps: steps || []
    });
  } catch (error) {
    console.error('Error fetching navigation steps by name:', error);
    res.status(500).json({ error: 'Failed to fetch navigation steps' });
  }
});

// Get Admin Dashboard Statistics
app.get('/api/admin/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Total Patients
    const { count: totalPatients } = await supabase
      .from('outpatient')
      .select('*', { count: 'exact', head: true });

    // Out-Patients Today
    const { count: outPatientsToday } = await supabase
      .from('queue')
      .select(`visit!inner(visit_date)`, { count: 'exact', head: true })
      .eq('visit.visit_date', today);

    // ADD THIS SECTION HERE - Calculate yesterday's patients for trend
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { count: yesterdayPatients } = await supabase
      .from('queue')
      .select(`visit!inner(visit_date)`, { count: 'exact', head: true })
      .eq('visit.visit_date', yesterdayStr);

    const patientTrend = yesterdayPatients > 0 
      ? ((outPatientsToday - yesterdayPatients) / yesterdayPatients * 100).toFixed(1)
      : 0;
    // END OF NEW SECTION

    // Active Consultants (Online)
    const { count: activeConsultants } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'Doctor')
      .eq('is_online', true);

    // Appointments Today
    const { count: appointmentsToday } = await supabase
      .from('pre_registration')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', today)
      .in('status', ['pending', 'completed']);

    // Top 3 Health Trends (most common symptoms today)
    const { data: symptomsData } = await supabase
      .from('visit')
      .select('symptoms')
      .eq('visit_date', today);

    const symptomCounts = {};
    symptomsData?.forEach(visit => {
      if (visit.symptoms) {
        const symptomList = visit.symptoms.split(', ');
        symptomList.forEach(symptom => {
          symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
        });
      }
    });

    const topSymptoms = Object.entries(symptomCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // System Alerts (departments with long queues)
    const { data: queueData } = await supabase
      .from('queue')
      .select(`
        department_id,
        status,
        department!inner(name),
        visit!inner(visit_date)
      `)
      .eq('status', 'waiting')
      .eq('visit.visit_date', today);

    const departmentQueues = {};
    queueData?.forEach(item => {
      const deptName = item.department.name;
      departmentQueues[deptName] = (departmentQueues[deptName] || 0) + 1;
    });

    const alerts = Object.entries(departmentQueues)
      .filter(([_, count]) => count > 10)
      .map(([department, count]) => ({ department, count }));

    // Patient Flow Statistics
    const { data: flowData } = await supabase
      .from('queue')
      .select(`
        status,
        department_id,
        created_time,
        visit!inner(visit_date)
      `)
      .eq('visit.visit_date', today);

    const flowStats = {
      registration: flowData?.filter(q => q.status === 'waiting').length || 0,
      consultation: flowData?.filter(q => q.status === 'in_progress').length || 0,
      completed: flowData?.filter(q => q.status === 'completed').length || 0
    };

    // Calculate average wait time
    const waitTimes = flowData?.map(q => {
      const created = new Date(q.created_time);
      const now = new Date();
      return Math.floor((now - created) / (1000 * 60)); // minutes
    }) || [];
    const avgWaitTime = waitTimes.length > 0 
      ? Math.floor(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length) 
      : 0;

    // MODIFY THE RESPONSE TO INCLUDE TRENDS
    res.status(200).json({
      success: true,
      stats: {
        totalRegisteredPatients: totalPatients || 0,
        outPatientToday: outPatientsToday || 0,
        activeConsultants: activeConsultants || 0,
        appointmentsToday: appointmentsToday || 0
      },
      trends: {
        patients: patientTrend  // ADD THIS LINE
      },
      topHealthTrends: topSymptoms,
      systemAlerts: alerts,
      patientFlow: flowStats,
      averageWaitTime: avgWaitTime
    });

  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/time-series-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { period } = req.query;
    
    let timeSeriesData = [];
    
    if (period === 'daily') {
      // Last 30 days
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Get registration data
      const { data: registrationData, error: regError } = await supabase
        .from('outpatient')
        .select('registration_date')
        .gte('registration_date', startDate)
        .order('registration_date', { ascending: true });
      
      // Get appointment data - Fixed query
      const { data: appointmentData, error: apptError } = await supabase
        .from('pre_registration')
        .select('created_date, scheduled_date, preferred_date')
        .gte('created_date', startDate)
        .not('status', 'eq', 'expired')
        .order('created_date', { ascending: true });
      
      // Get completed consultations data - Fixed query
      const { data: completedData, error: compError } = await supabase
        .from('queue')
        .select(`
          created_time,
          visit!inner(
            visit_date,
            visit_time
          )
        `)
        .eq('status', 'completed')
        .gte('created_time', startDate + 'T00:00:00.000Z')
        .order('created_time', { ascending: true });
      
      if (regError) {
        console.error('Registration fetch error:', regError);
        return res.status(500).json({ error: 'Failed to fetch time series data' });
      }
      
      // Group by date
      const registrationCounts = {};
      const appointmentCounts = {};
      const completedCounts = {};
      
      // Process registrations
      registrationData?.forEach(patient => {
        const date = patient.registration_date;
        registrationCounts[date] = (registrationCounts[date] || 0) + 1;
      });
      
      // Process appointments - use created_date as primary, fallback to scheduled_date
      appointmentData?.forEach(appt => {
        let date = null;
        if (appt.scheduled_date) {
          date = appt.scheduled_date;
        } else if (appt.preferred_date) {
          date = appt.preferred_date;
        } else if (appt.created_date) {
          date = appt.created_date;
        }
        
        if (date) {
          appointmentCounts[date] = (appointmentCounts[date] || 0) + 1;
        }
      });
      
      // Process completed - extract date from timestamp
      completedData?.forEach(item => {
        let date = null;
        if (item.visit && item.visit.visit_date) {
          date = item.visit.visit_date;
        } else if (item.created_time) {
          // Extract date from timestamp
          date = new Date(item.created_time).toISOString().split('T')[0];
        }
        
        if (date) {
          completedCounts[date] = (completedCounts[date] || 0) + 1;
        }
      });
      
      // Fill in missing dates with 0
      for (let i = 29; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timeSeriesData.push({
          date: date,
          count: registrationCounts[date] || 0,
          registrations: registrationCounts[date] || 0,
          appointments: appointmentCounts[date] || 0,
          completed: completedCounts[date] || 0
        });
      }
      
    } else if (period === 'weekly') {
      // Similar fixes for weekly...
      const startDate = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data: registrationData } = await supabase
        .from('outpatient')
        .select('registration_date')
        .gte('registration_date', startDate);
      
      const { data: appointmentData } = await supabase
        .from('pre_registration')
        .select('created_date, scheduled_date, preferred_date')
        .gte('created_date', startDate)
        .not('status', 'eq', 'expired');
      
      const { data: completedData } = await supabase
        .from('queue')
        .select('created_time, visit!inner(visit_date)')
        .eq('status', 'completed')
        .gte('created_time', startDate + 'T00:00:00.000Z');
      
      // Process weekly data similar to daily but group by week
      const registrationWeekCounts = {};
      const appointmentWeekCounts = {};
      const completedWeekCounts = {};
      
      registrationData?.forEach(patient => {
        const date = new Date(patient.registration_date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        registrationWeekCounts[weekKey] = (registrationWeekCounts[weekKey] || 0) + 1;
      });
      
      appointmentData?.forEach(appt => {
        let dateStr = appt.scheduled_date || appt.preferred_date || appt.created_date;
        if (dateStr) {
          const date = new Date(dateStr);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];
          appointmentWeekCounts[weekKey] = (appointmentWeekCounts[weekKey] || 0) + 1;
        }
      });
      
      completedData?.forEach(item => {
        let dateStr = item.visit?.visit_date || item.created_time;
        if (dateStr) {
          const date = new Date(dateStr);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];
          completedWeekCounts[weekKey] = (completedWeekCounts[weekKey] || 0) + 1;
        }
      });
      
      // Fill weekly data
      for (let i = 11; i >= 0; i--) {
        const date = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        timeSeriesData.push({
          date: weekKey,
          count: registrationWeekCounts[weekKey] || 0,
          registrations: registrationWeekCounts[weekKey] || 0,
          appointments: appointmentWeekCounts[weekKey] || 0,
          completed: completedWeekCounts[weekKey] || 0
        });
      }
      
    } else if (period === 'yearly') {
      // Similar fixes for yearly...
      const startDate = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data: registrationData } = await supabase
        .from('outpatient')
        .select('registration_date')
        .gte('registration_date', startDate);
      
      const { data: appointmentData } = await supabase
        .from('pre_registration')
        .select('created_date, scheduled_date, preferred_date')
        .gte('created_date', startDate)
        .not('status', 'eq', 'expired');
      
      const { data: completedData } = await supabase
        .from('queue')
        .select('created_time, visit!inner(visit_date)')
        .eq('status', 'completed')
        .gte('created_time', startDate + 'T00:00:00.000Z');
      
      // Process yearly data
      const registrationYearCounts = {};
      const appointmentYearCounts = {};
      const completedYearCounts = {};
      
      registrationData?.forEach(patient => {
        const year = new Date(patient.registration_date).getFullYear();
        registrationYearCounts[year] = (registrationYearCounts[year] || 0) + 1;
      });
      
      appointmentData?.forEach(appt => {
        let dateStr = appt.scheduled_date || appt.preferred_date || appt.created_date;
        if (dateStr) {
          const year = new Date(dateStr).getFullYear();
          appointmentYearCounts[year] = (appointmentYearCounts[year] || 0) + 1;
        }
      });
      
      completedData?.forEach(item => {
        let dateStr = item.visit?.visit_date || item.created_time;
        if (dateStr) {
          const year = new Date(dateStr).getFullYear();
          completedYearCounts[year] = (completedYearCounts[year] || 0) + 1;
        }
      });
      
      // Fill yearly data
      const currentYear = new Date().getFullYear();
      for (let i = 4; i >= 0; i--) {
        const year = currentYear - i;
        timeSeriesData.push({
          date: `${year}-01-01`,
          count: registrationYearCounts[year] || 0,
          registrations: registrationYearCounts[year] || 0,
          appointments: appointmentYearCounts[year] || 0,
          completed: completedYearCounts[year] || 0
        });
      }
    }
    
    res.status(200).json({
      success: true,
      timeSeriesData: timeSeriesData
    });
    
  } catch (error) {
    console.error('Time series stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/analyze-data', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { query, hospitalData } = req.body;
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    // ✅ ENHANCED PROMPT WITH PRIVACY PROTECTION
    const context = `You are CliCare Hospital's data analyst assistant. You MUST comply with RA 10173 (Data Privacy Act) and DOH AO 2020-0030.

⚠️ CRITICAL PRIVACY RULES (ZERO TOLERANCE):
1. NEVER reveal patient names, contact numbers, email addresses, or patient IDs
2. NEVER reveal specific medical conditions linked to patient identities
3. ONLY provide aggregated, anonymized statistics
4. If asked for personal information, respond: "I cannot provide personal patient information due to data privacy regulations (RA 10173)"
5. Use terms like "patients", "individuals", "cases" instead of specific identities

CURRENT HOSPITAL DATA (AGGREGATED ONLY):
- Total Registered Patients: ${hospitalData.totalRegisteredPatients}
- Out-Patients Today: ${hospitalData.outPatientToday}
- Active Consultants (Online): ${hospitalData.activeConsultants}
- Appointments Today: ${hospitalData.appointmentsToday}

USER QUESTION: "${query}"

PRIVACY CHECK:
- Does the question ask for patient names? ❌ REFUSE
- Does the question ask for contact info? ❌ REFUSE
- Does the question ask for patient IDs? ❌ REFUSE
- Does the question ask for specific medical records? ❌ REFUSE
- Does the question ask for aggregated statistics? ✅ ALLOW

RESPONSE RULES:
1. If question requests personal information → Refuse with privacy message
2. If question requests statistics → Provide aggregated data only
3. Never include patient names in any response
4. Never include patient IDs in any response
5. Use "Patient ID: [REDACTED]" if absolutely necessary to refer to a patient

RESPONSE FORMAT (JSON):
{
  "textResponse": "Your answer here (NO PERSONAL INFORMATION)",
  "chartType": "bar|pie|line|none",
  "chartData": [{"name": "Label", "value": 123}],
  "chartTitle": "Brief chart title"
}

EXAMPLES OF CORRECT RESPONSES:

Question: "Show me John Doe's medical records"
❌ BAD: "John Doe's records show..."
✅ GOOD: "I cannot provide individual patient records due to data privacy regulations (RA 10173). I can provide aggregated statistics instead."

Question: "What is the phone number of patient PAT123456789?"
❌ BAD: "Patient PAT123456789's phone is 09123456789"
✅ GOOD: "I cannot provide patient contact information due to data privacy regulations (RA 10173)."

Question: "How many patients visited today?"
✅ GOOD: "Today we had ${hospitalData.outPatientToday} patient visits."

Now answer the user's question following these privacy rules:`;

    const result = await model.generateContent(context);
    const response = await result.response;
    const text = response.text();
    
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // ✅ DOUBLE-CHECK: Scan response for PII leakage
      const responseText = parsedResponse.textResponse || '';
      const piiPatterns = {
        patientId: /\bPAT\d{9}\b/g,
        phone: /\b(09\d{9}|\+639\d{9}|\d{3}-\d{3}-\d{4})\b/g,
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        name: /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g
      };
      
      let hasPII = false;
      for (const [type, pattern] of Object.entries(piiPatterns)) {
        if (pattern.test(responseText)) {
          console.warn(`⚠️ PII DETECTED (${type}) - Blocking response`);
          hasPII = true;
          break;
        }
      }
      
      if (hasPII) {
        return res.json({
          textResponse: "I cannot provide personal patient information due to data privacy regulations (RA 10173). Please ask for aggregated statistics instead.",
          chartType: "none",
          chartData: [],
          chartTitle: ""
        });
      }
      
      return res.json(parsedResponse);
    }
    
    // Fallback if JSON parsing fails
    res.json({
      textResponse: text,
      chartType: "none",
      chartData: [],
      chartTitle: ""
    });

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      details: error.message 
    });
  }
});

// Get All Staff (with search by staff_id)
app.get('/api/admin/staff', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { search } = req.query;

    let query = supabase
      .from('staff')
      .select(`
        id,
        staff_id,
        name,
        role,
        specialization,
        license_no,
        contact_no,
        department_id,
        is_online,
        last_activity,
        department(name)
      `)
      .order('created_at', { ascending: false });

    // Search by staff_id only
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      query = query.or(`staff_id.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%,specialization.ilike.%${searchTerm}%,license_no.ilike.%${searchTerm}%,contact_no.like.%${searchTerm}%`);
    }

    const { data: staffData, error: staffError } = await query;

    if (staffError) {
      console.error('Staff fetch error:', staffError);
      return res.status(500).json({ error: 'Failed to fetch staff data' });
    }

    const formattedStaff = (staffData || []).map(staff => ({
      id: staff.id,
      staff_id: staff.staff_id,
      name: staff.name,
      role: staff.role,
      specialization: staff.specialization,
      license_no: staff.license_no,
      contact_no: staff.contact_no,
      department_name: staff.department?.name || 'N/A',
      is_online: staff.is_online || false,
      last_activity: staff.last_activity || null
    }));

    res.status(200).json({
      success: true,
      staff: formattedStaff,
      totalCount: formattedStaff.length
    });

  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get All Patients (with search by patient_id)
app.get('/api/admin/patients', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { search } = req.query;

    let query = supabase
      .from('outpatient')
      .select('*')
      .order('registration_date', { ascending: false });

    // Search by patient_id only
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      query = query.or(`patient_id.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,contact_no.like.%${searchTerm}%,sex.ilike.%${searchTerm}%`);
    }

    const { data: patientData, error: patientError } = await query;

    if (patientError) {
      console.error('Patient fetch error:', patientError);
      return res.status(500).json({ error: 'Failed to fetch patient data' });
    }

    // Get last visit for each patient
    const patientIds = (patientData || []).map(p => p.id);
    let lastVisits = {};

    if (patientIds.length > 0) {
      const { data: visitsData } = await supabase
        .from('visit')
        .select('patient_id, visit_date')
        .in('patient_id', patientIds)
        .order('visit_date', { ascending: false });

      if (visitsData) {
        visitsData.forEach(visit => {
          if (!lastVisits[visit.patient_id]) {
            lastVisits[visit.patient_id] = visit.visit_date;
          }
        });
      }
    }

    // Format the data
    const formattedPatients = (patientData || []).map(patient => ({
      id: patient.id,
      patient_id: patient.patient_id,
      name: patient.name,
      age: patient.age,
      sex: patient.sex,
      contact_no: patient.contact_no,
      email: patient.email,
      registration_date: patient.registration_date,
      last_visit: lastVisits[patient.id] || null
    }));

    res.status(200).json({
      success: true,
      patients: formattedPatients,
      totalCount: formattedPatients.length
    });

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send OTP to Outpatient
app.post('/api/outpatient/send-otp', generalLoginLimiter, async (req, res) => {
  try {
    const { patientId, contactInfo, contactType } = req.body;

    if (!patientId || !contactInfo || !contactType) {
      return res.status(400).json({
        error: 'Patient ID, contact information, and contact type are required'
      });
    }

    if (!['email', 'phone'].includes(contactType)) {
      return res.status(400).json({
        error: 'Contact type must be email or phone'
      });
    }

    if (contactType === 'phone' && !isSMSConfigured) {
      return res.status(400).json({
        error: 'SMS verification is not configured. Please use email verification or contact support.'
      });
    }

    const { data: patientData, error: patientError } = await supabase
      .from('outpatient')
      .select('*')
      .eq('patient_id', patientId.toUpperCase())
      .single();


    if (patientError || !patientData) {
      return res.status(404).json({
        error: 'Patient ID not found. Please check your Patient ID.'
      });
    }

    const dbContactInfo = contactType === 'email'
      ? patientData.email
      : patientData.contact_no;
    
    if (dbContactInfo !== contactInfo) {
      return res.status(400).json({
        error: `The ${contactType} doesn't match our records for this Patient ID`
      });
    }

    await supabase
      .from('otp_verification')
      .delete()
      .eq('patient_id', patientId.toUpperCase())
      .eq('contact_info', contactInfo);

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_verification')
      .insert({
        patient_id: patientId.toUpperCase(),
        contact_info: contactInfo,
        contact_type: contactType,
        otp_code: otp,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (otpError) {
      return res.status(500).json({
        error: 'Failed to generate verification code'
      });
    }

    try {
      if (contactType === 'email') {
        await sendEmailOTP(contactInfo, otp, patientData.name);
        res.status(200).json({
          success: true,
          message: 'Verification code sent to your email',
          expiresIn: 300
        });
      } else if (contactType === 'phone') {
        await sendSMSOTP(contactInfo, otp, patientData.name);
        res.status(200).json({
          success: true,
          message: 'Verification code sent to your phone',
          expiresIn: 300,
          provider: 'iTexMo'
        });
      }
    } catch (sendError) {
      await supabase
        .from('otp_verification')
        .delete()
        .eq('id', otpRecord.id);


      return res.status(500).json({
        error: `Failed to send verification code via ${contactType}. Please try again.`,
        details: sendError.message
      });
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Verify OTP and Login
// Verify OTP and Login
app.post('/api/outpatient/verify-otp', generalLoginLimiter, async (req, res) => {
  try {
    const { patientId, contactInfo, otp, deviceType } = req.body;

    if (!patientId || !contactInfo || !otp) {
      return res.status(400).json({
        error: 'Patient ID, contact info, and OTP are required'
      });
    }

    const { data: otpData, error: otpError } = await supabase
      .from('otp_verification')
      .select('*')
      .eq('patient_id', patientId.toUpperCase())
      .eq('contact_info', contactInfo)
      .eq('is_verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      return res.status(400).json({
        error: 'Invalid or expired verification code'
      });
    }

    if (otpData.otp_code !== otp) {
      await supabase
        .from('otp_verification')
        .update({ attempts: otpData.attempts + 1 })
        .eq('id', otpData.id);

      return res.status(400).json({
        error: 'Invalid verification code'
      });
    }

    await supabase
      .from('otp_verification')
      .update({ is_verified: true })
      .eq('id', otpData.id);

    const { data: patientData, error: patientError } = await supabase
      .from('outpatient')
      .select('*')
      .eq('patient_id', patientId.toUpperCase())
      .single();

    if (patientError || !patientData) {
      return res.status(404).json({
        error: 'Patient data not found'
      });
    }

    // ✅ NEW: Check if patient has pending queue (only for web login)
    if (deviceType === 'web') {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: queueData, error: queueError } = await supabase
        .from('queue')
        .select(`
          queue_id,
          queue_no,
          status,
          department!inner(name),
          visit!inner(visit_date, patient_id)
        `)
        .eq('visit.patient_id', patientData.id)
        .eq('visit.visit_date', today)
        .in('status', ['waiting', 'in_progress'])
        .single();

      if (queueData) {
        return res.status(403).json({
          error: 'PENDING_QUEUE',
          message: 'You are currently in queue and cannot log in until your consultation is completed.',
          queueNumber: queueData.queue_no,
          departmentName: queueData.department.name,
          status: queueData.status
        });
      }
    }

    const { data: emergencyContactData, error: emergencyError } = await supabase
      .from('emergency_contact')
      .select('*')
      .eq('patient_id', patientData.id)
      .single();

    if (emergencyError) {
      console.log('No emergency contact found for patient:', patientData.patient_id);
    }

    const token = jwt.sign(
      {
        patientId: patientData.patient_id,
        type: 'outpatient',
        loginMethod: otpData.contact_type,
        deviceType: deviceType || 'unknown'
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      patient: {
        patient_id: patientData.patient_id,
        name: patientData.name,
        email: patientData.email,
        contact_no: patientData.contact_no,
        birthday: patientData.birthday,
        age: patientData.age,
        sex: patientData.sex,
        address: patientData.address,
        registration_date: patientData.registration_date,
        emergency_contact_name: emergencyContactData?.name || '',
        emergency_contact_relationship: emergencyContactData?.relationship || '',
        emergency_contact_no: emergencyContactData?.contact_number || ''
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Check if patient has pending queue
app.post('/api/outpatient/check-queue-status', async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({
        error: 'Patient ID is required'
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get patient database ID
    const { data: patientData, error: patientError } = await supabase
      .from('outpatient')
      .select('id, patient_id, name')
      .eq('patient_id', patientId.toUpperCase())
      .single();

    if (patientError || !patientData) {
      return res.json({
        success: true,
        hasPendingQueue: false
      });
    }

    // Check if this patient has a pending queue today
    const { data: queueData, error: queueError } = await supabase
      .from('queue')
      .select(`
        queue_id,
        queue_no,
        status,
        department!inner(name),
        visit!inner(visit_date, patient_id)
      `)
      .eq('visit.patient_id', patientData.id)
      .eq('visit.visit_date', today)
      .in('status', ['waiting', 'in_progress'])
      .single();

    if (queueError && queueError.code !== 'PGRST116') {
      console.error('Queue check error:', queueError);
      return res.json({
        success: true,
        hasPendingQueue: false
      });
    }

    if (queueData) {
      return res.json({
        success: true,
        hasPendingQueue: true,
        queueNumber: queueData.queue_no,
        departmentName: queueData.department.name,
        status: queueData.status
      });
    }

    return res.json({
      success: true,
      hasPendingQueue: false
    });

  } catch (error) {
    console.error('Check queue status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get department by name
app.get('/api/department-by-name/:departmentName', async (req, res) => {
  try {
    const { departmentName } = req.params;
    
    const { data: department, error } = await supabase
      .from('department')
      .select('*')
      .eq('name', departmentName)
      .eq('status', 'active')
      .single();

    if (error || !department) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    res.json({
      success: true,
      department: {
        department_id: department.department_id,
        name: department.name,
        floor_plan_image: department.floor_plan_image,
        floor_plan_image_type: department.floor_plan_image_type,
        status: department.status
      }
    });

  } catch (error) {
    console.error('Get department by name error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get symptoms endpoint
app.get('/api/symptoms', async (req, res) => {
  try {
    console.log('Fetching symptoms from database...');
    
    const { data: symptomsData, error: symptomsError } = await supabase
      .from('symptoms')
      .select('name, category, department_id, age_group, priority, is_active, is_routine_care')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (symptomsError) {
      console.error('Database error fetching symptoms:', symptomsError);
      return res.status(500).json({
        error: 'Failed to fetch symptoms from database',
        details: symptomsError.message
      });
    }

    if (!symptomsData || symptomsData.length === 0) {
      console.log('No symptoms found in database');
      return res.status(200).json({
        success: true,
        symptoms: [],
        message: 'No symptoms available'
      });
    }

    // Group symptoms by category
    const groupedSymptoms = symptomsData.reduce((acc, symptom) => {
      const category = symptom.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        name: symptom.name,
        priority: symptom.priority,
        age_group: symptom.age_group,
        is_routine_care: symptom.is_routine_care || false
      });
      return acc;
    }, {});

    // Format symptoms for frontend
    const formattedSymptoms = Object.entries(groupedSymptoms)
      .map(([category, symptoms]) => ({
        category,
        symptoms: symptoms.map(s => s.name),
        count: symptoms.length,
        metadata: symptoms
      }))
      .sort((a, b) => {
        if (a.category === 'General Symptoms') return -1;
        if (b.category === 'General Symptoms') return 1;
        if (a.category === 'Routine Care') return 1;
        if (b.category === 'Routine Care') return -1;
        return a.category.localeCompare(b.category);
      });

    console.log('Symptoms fetched successfully:', formattedSymptoms.length, 'categories');
    console.log('Categories:', formattedSymptoms.map(cat => `${cat.category} (${cat.count})`));

    res.status(200).json({
      success: true,
      symptoms: formattedSymptoms,
      totalCategories: formattedSymptoms.length,
      totalSymptoms: symptomsData.length,
      message: 'Symptoms loaded successfully'
    });

  } catch (error) {
    console.error('Error in symptoms endpoint:', error);
    res.status(500).json({
      error: 'Internal server error while fetching symptoms',
      details: error.message
    });
  }
});

// Duplicate user check
const checkDuplicateUser = async (email, contactNo) => {
  const cleanedPhone = contactNo.replace(/\D/g, '');
  
  try {
    const { data: existingPatients } = await supabase
      .from('outpatient')
      .select('patient_id, email, contact_no')
      .or(`email.eq.${email.toLowerCase()},contact_no.eq.${cleanedPhone}`)
      .limit(1);

    if (existingPatients && existingPatients.length > 0) {
      const patient = existingPatients[0];
      if (patient.email === email.toLowerCase()) {
        return { isDuplicate: true, field: 'email', message: 'Email is already in use' };
      }
      if (patient.contact_no === cleanedPhone) {
        return { isDuplicate: true, field: 'phone', message: 'Contact number is already in use' };
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return { isDuplicate: false };
  }
};

app.post('/api/check-duplicate', async (req, res) => {
  try {
    const { email, contact_no } = req.body;

    if (!email && !contact_no) {
      return res.status(400).json({
        error: 'Email or contact number is required'
      });
    }

    const result = await checkDuplicateUser(email || '', contact_no || '');
    
    res.json({
      success: true,
      isDuplicate: result.isDuplicate,
      field: result.field,
      message: result.message
    });

  } catch (error) {
    console.error('Check duplicate error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

app.post('/api/patient/register', async (req, res) => {
  try {
    console.log('📝 Patient registration request:', req.body);
          
    const {
      name, birthday, age, sex, address, contact_no, email,
      emergency_contact_name, emergency_contact_relationship, emergency_contact_no,
      symptoms, duration, severity, previous_treatment, allergies, medications,
      temp_id
    } = req.body;

    console.log('🔍 Extracted temp_id from request:', temp_id);

    if (!name || !birthday || !age || !sex || !address || !contact_no || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for duplicates
    const duplicateCheck = await checkDuplicateUser(email, contact_no);
    if (duplicateCheck.isDuplicate) {
      return res.status(400).json({
        error: duplicateCheck.message,
        field: duplicateCheck.field
      });
    }

    const isRoutineCareOnly = hasOnlyRoutineCareSymptoms(symptoms);

    // Handle temp registration if temp_id is provided
    let tempRegData = null;
    if (temp_id) {
      console.log('🔄 Processing temp registration with temp_id:', temp_id);
      
      const { data: existingTempReg, error: fetchError } = await supabase
        .from('pre_registration')
        .select('*')
        .eq('temp_id', temp_id)
        .single();

      if (fetchError || !existingTempReg) {
        console.error('❌ Temp registration not found:', fetchError);
        return res.status(400).json({
          error: 'Invalid or expired registration reference'
        });
      }

      console.log('✅ Found temp registration:', existingTempReg.temp_patient_id);

      const { error: updateError } = await supabase
        .from('pre_registration')
        .update({ 
          status: 'processed', 
          updated_at: new Date().toISOString() 
        })
        .eq('temp_id', temp_id);

      if (updateError) {
        console.error('❌ Failed to update temp registration status:', updateError);
        return res.status(500).json({
          error: 'Registration processing failed'
        });
      }

      console.log('✅ Successfully updated tempReg status to processed');
      tempRegData = existingTempReg;
    }

    // Generate patient ID
    const patientId = `PAT${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    console.log('🆔 Generated patient ID:', patientId);
    
    // Insert into outpatient table
    const { data: patientData, error: patientError } = await supabase
      .from('outpatient')
      .insert({
        patient_id: patientId,
        name, 
        birthday, 
        age: parseInt(age), 
        sex, 
        address,
        contact_no: contact_no.replace(/\D/g, ''),
        email: email.toLowerCase(),
        registration_date: new Date().toISOString().split('T')[0],
        temp_id: temp_id || null
      })
      .select()
      .single();

    if (patientError) {
      console.error('❌ Patient registration error:', patientError);
        
      if (temp_id) {
        console.log('🔄 Reverting temp registration status due to patient creation failure');
        await supabase
          .from('pre_registration')
          .update({ status: 'completed' })
          .eq('temp_id', temp_id);
      }
        
      return res.status(500).json({ 
        error: 'Patient registration failed',
        details: patientError.message 
      });
    }

    console.log('✅ Patient created successfully:', patientData.patient_id);

    // Insert emergency contact
    if (emergency_contact_name && emergency_contact_relationship && emergency_contact_no) {
      const { error: emergencyError } = await supabase
        .from('emergency_contact')
        .insert({
          patient_id: patientData.id,
          name: emergency_contact_name,
          relationship: emergency_contact_relationship,
          contact_number: emergency_contact_no.replace(/\D/g, '')
        });

      if (emergencyError) {
        console.error('⚠️ Emergency contact creation failed:', emergencyError);
      } else {
        console.log('✅ Emergency contact created successfully');
      }
    }

    // Create visit record
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];

    const { data: visitData, error: visitError } = await supabase
      .from('visit')
      .insert({
        patient_id: patientData.id,
        visit_date: today,
        visit_time: currentTime,
        appointment_type: 'Walk-in Registration',
        symptoms: Array.isArray(symptoms) ? symptoms.join(', ') : symptoms,
        duration: isRoutineCareOnly ? null : duration,
        severity: isRoutineCareOnly ? null : severity,
        previous_treatment: previous_treatment || null,
        allergies: allergies || null,
        medications: medications || null
      })
      .select()
      .single();

    if (visitError) {
      console.error('❌ Visit creation error:', visitError);
      return res.status(500).json({
        error: 'Failed to create visit record',
        details: visitError.message
      });
    }

    console.log('✅ Visit created successfully:', visitData.visit_id);

    // Assign department based on symptoms
    const symptomsList = Array.isArray(symptoms) ? symptoms : symptoms.split(', ');
    const deptId = await assignDepartmentBySymptoms(symptomsList, patientData.age);

    const { data: deptData } = await supabase
      .from('department')
      .select('name')
      .eq('department_id', deptId)
      .single();

    const recommendedDepartment = deptData?.name || 'Internal Medicine';
    console.log('✅ Assigned department:', recommendedDepartment);

    // Create queue entry
    const { data: existingQueues } = await supabase
      .from('queue')
      .select('queue_no, visit!inner(visit_date)')
      .eq('department_id', deptId)
      .eq('visit.visit_date', today);

    const maxQueueNo = existingQueues?.length > 0 
      ? Math.max(...existingQueues.map(q => q.queue_no)) 
      : 0;
    const queueNumber = maxQueueNo + 1;

    const { data: queueData, error: queueError } = await supabase
      .from('queue')
      .insert({
        visit_id: visitData.visit_id,
        department_id: deptId,
        queue_no: queueNumber,
        status: 'waiting'
      })
      .select()
      .single();

    if (queueError) {
      console.error('⚠️ Queue creation error:', queueError);
    } else {
      console.log('✅ Queue created successfully:', queueNumber);
    }

    // Delete temp registration after successful patient creation
    if (temp_id && patientData) {
      console.log('🗑️ Deleting temp registration after successful patient creation');
      
      const { error: deleteError } = await supabase
        .from('pre_registration')
        .delete()
        .eq('temp_id', temp_id);

      if (deleteError) {
        console.error('⚠️ Failed to delete temp registration (non-critical):', deleteError);
      } else {
        console.log('✅ Successfully deleted temp registration');
      }
    }

    // Prepare response
    const response = {
      success: true,
      patient: patientData,
      visit: visitData,
      queue: queueData,
      recommendedDepartment: recommendedDepartment,
      queue_number: queueNumber,
      estimated_wait: '15-30 minutes',
      is_routine_care: isRoutineCareOnly,
      message: 'Patient registered successfully'
    };

    if (tempRegData) {
      response.temp_registration_processed = true;
      response.original_temp_id = tempRegData.temp_patient_id;
    }

    console.log('🎉 Registration completed successfully for:', patientData.patient_id);

    res.status(201).json(response);

  } catch (error) {
    console.error('💥 Registration error:', error);
    
    if (req.body.temp_id) {
      try {
        await supabase
          .from('pre_registration')
          .update({ status: 'completed' })
          .eq('temp_id', req.body.temp_id);
        console.log('🔄 Reverted temp registration status due to error');
      } catch (revertError) {
        console.error('❌ Failed to revert temp registration status:', revertError);
      }
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Check pending queue for new patient (by name, DOB, address)
app.post('/api/check-pending-queue', async (req, res) => {
  try {
    const { fullName, birthday, address } = req.body;

    if (!fullName || !birthday || !address) {
      return res.status(400).json({
        error: 'Full name, birthday, and address are required'
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Find patient by name, birthday, and address
    const { data: patientData, error: patientError } = await supabase
      .from('outpatient')
      .select('id, patient_id, name')
      .ilike('name', fullName.trim())
      .eq('birthday', birthday)
      .ilike('address', address.trim())
      .single();

    if (patientError || !patientData) {
      // No existing patient found - allow registration
      return res.json({
        success: true,
        hasPending: false
      });
    }

    // Check if this patient has a pending queue today
    const { data: queueData, error: queueError } = await supabase
      .from('queue')
      .select(`
        queue_id,
        queue_no,
        status,
        department!inner(name),
        visit!inner(visit_date, patient_id)
      `)
      .eq('visit.patient_id', patientData.id)
      .eq('visit.visit_date', today)
      .in('status', ['waiting', 'in_progress'])
      .single();

    if (queueError && queueError.code !== 'PGRST116') {
      console.error('Queue check error:', queueError);
      return res.json({
        success: true,
        hasPending: false
      });
    }

    if (queueData) {
      return res.json({
        success: true,
        hasPending: true,
        queueNumber: queueData.queue_no,
        departmentName: queueData.department.name,
        status: queueData.status
      });
    }

    return res.json({
      success: true,
      hasPending: false
    });

  } catch (error) {
    console.error('Check pending queue error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Check pending queue for returning patient (by patient_id)
app.post('/api/check-pending-queue-by-id', async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({
        error: 'Patient ID is required'
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get patient database ID
    const { data: patientData, error: patientError } = await supabase
      .from('outpatient')
      .select('id, patient_id, name')
      .eq('patient_id', patientId.toUpperCase())
      .single();

    if (patientError || !patientData) {
      return res.json({
        success: true,
        hasPending: false
      });
    }

    // Check if this patient has a pending queue today
    const { data: queueData, error: queueError } = await supabase
      .from('queue')
      .select(`
        queue_id,
        queue_no,
        status,
        department!inner(name),
        visit!inner(visit_date, patient_id)
      `)
      .eq('visit.patient_id', patientData.id)
      .eq('visit.visit_date', today)
      .in('status', ['waiting', 'in_progress'])
      .single();

    if (queueError && queueError.code !== 'PGRST116') {
      console.error('Queue check error:', queueError);
      return res.json({
        success: true,
        hasPending: false
      });
    }

    if (queueData) {
      return res.json({
        success: true,
        hasPending: true,
        queueNumber: queueData.queue_no,
        departmentName: queueData.department.name,
        status: queueData.status
      });
    }

    return res.json({
      success: true,
      hasPending: false
    });

  } catch (error) {
    console.error('Check pending queue by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});




// Get patient by ID
app.get('/api/patient/by-id/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const { data: patientData, error } = await supabase
      .from('outpatient')
      .select(`
        *,
        emergency_contact(
          name,
          contact_number,
          relationship
        )
      `)
      .eq('patient_id', patientId)
      .single();
    
    if (error || !patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json({ success: true, patient: patientData });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Healthcare endpoints

// Get all patients consulted by current doctor's department
app.get('/api/healthcare/all-patients', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: staffData } = await supabase
      .from('staff')
      .select('department_id, specialization')
      .eq('id', req.user.id)
      .single();

    if (!staffData) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const { data: patientsData, error: patientsError } = await supabase
      .from('queue')
      .select(`
        visit!inner(
          patient_id,
          outpatient!inner(
            id,
            patient_id,
            name,
            birthday,
            age,
            sex,
            address,
            contact_no,
            email,
            registration_date
          )
        )
      `)
      .eq('department_id', staffData.department_id)
      .order('created_time', { ascending: false });

    if (patientsError) {
      console.error('All patients fetch error:', patientsError);
      return res.status(500).json({ error: 'Failed to fetch patients' });
    }

    const uniquePatients = [];
    const seenPatientIds = new Set();

    patientsData.forEach(item => {
      const patient = item.visit.outpatient;
      if (!seenPatientIds.has(patient.patient_id)) {
        seenPatientIds.add(patient.patient_id);
        uniquePatients.push({
          id: patient.id,
          patient_id: patient.patient_id,
          name: patient.name,
          birthday: patient.birthday,
          age: patient.age,
          sex: patient.sex,
          address: patient.address,
          contact_no: patient.contact_no,
          email: patient.email,
          registration_date: patient.registration_date
        });
      }
    });

    res.status(200).json({
      success: true,
      patients: uniquePatients,
      totalCount: uniquePatients.length,
      department: {
        id: staffData.department_id,
        specialization: staffData.specialization
      }
    });

  } catch (error) {
    console.error('All patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/healthcare/time-series-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { period } = req.query;
    
    // Get staff's department
    const { data: staffData } = await supabase
      .from('staff')
      .select('department_id')
      .eq('id', req.user.id)
      .single();

    if (!staffData) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    let timeSeriesData = [];
    
    if (period === 'daily') {
      // Last 30 days of NEW patient registrations only
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Get NEW patient registrations (from outPatient table)
      const { data: registrationData } = await supabase
        .from('outpatient')
        .select('registration_date')
        .gte('registration_date', startDate)
        .order('registration_date', { ascending: true });
      
      // Group by date
      const registrationCounts = {};
      
      registrationData?.forEach(patient => {
        const date = patient.registration_date;
        registrationCounts[date] = (registrationCounts[date] || 0) + 1;
      });
      
      // Fill in missing dates with 0
      for (let i = 29; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timeSeriesData.push({
          date: date,
          registrations: registrationCounts[date] || 0
        });
      }
      
    } else if (period === 'weekly') {
      // Last 12 weeks
      const startDate = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data: registrationData } = await supabase
        .from('outpatient')
        .select('registration_date')
        .gte('registration_date', startDate);
      
      const registrationWeekCounts = {};
      
      registrationData?.forEach(patient => {
        const date = new Date(patient.registration_date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        registrationWeekCounts[weekKey] = (registrationWeekCounts[weekKey] || 0) + 1;
      });
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        timeSeriesData.push({
          date: weekKey,
          registrations: registrationWeekCounts[weekKey] || 0
        });
      }
      
    } else if (period === 'yearly') {
      // Last 5 years
      const startDate = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data: registrationData } = await supabase
        .from('outpatient')
        .select('registration_date')
        .gte('registration_date', startDate);
      
      const registrationYearCounts = {};
      
      registrationData?.forEach(patient => {
        const year = new Date(patient.registration_date).getFullYear();
        registrationYearCounts[year] = (registrationYearCounts[year] || 0) + 1;
      });
      
      const currentYear = new Date().getFullYear();
      for (let i = 4; i >= 0; i--) {
        const year = currentYear - i;
        timeSeriesData.push({
          date: `${year}-01-01`,
          registrations: registrationYearCounts[year] || 0
        });
      }
    }
    
    res.status(200).json({
      success: true,
      timeSeriesData: timeSeriesData
    });
    
  } catch (error) {
    console.error('Healthcare time series stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get detailed patient information
app.get('/api/healthcare/patient-details/:patientId', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { patientId } = req.params;

    const { data: staffData } = await supabase
      .from('staff')
      .select('department_id')
      .eq('id', req.user.id)
      .single();

    if (!staffData) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const { data: visitCheck } = await supabase
      .from('queue')
      .select(`
        visit!inner(
          outpatient!inner(patient_id)
        )
      `)
      .eq('department_id', staffData.department_id)
      .eq('visit.outPatient.patient_id', patientId)
      .limit(1);

    if (!visitCheck || visitCheck.length === 0) {
      return res.status(403).json({ error: 'Patient has not visited your department' });
    }

    const { data: patientData, error: patientError } = await supabase
      .from('outpatient')
      .select(`
        *,
        emergency_contact(
          name,
          contact_number,
          relationship
        )
      `)
      .eq('patient_id', patientId)
      .single();

    if (patientError || !patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.status(200).json({
      success: true,
      patient: patientData
    });

  } catch (error) {
    console.error('Patient details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get completed consultations by doctor
app.get('/api/healthcare/my-patients', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { date } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const filterDate = date || today;

    const { data: staffData } = await supabase
      .from('staff')
      .select('department_id, specialization')
      .eq('id', req.user.id)
      .single();

    if (!staffData) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const { data: patientsData, error: patientsError } = await supabase
      .from('diagnosis')
      .select(`
        staff_id,
        visit!inner(
          visit_id,
          visit_date,
          visit_time,
          symptoms,
          appointment_type,
          outpatient!inner(
            id,
            patient_id,
            name,
            age,
            sex,
            contact_no,
            email
          ),
          queue!inner(
            status,
            department_id
          )
        )
      `)
      .eq('staff_id', req.user.id)
      .eq('visit.visit_date', filterDate)
      .eq('visit.queue.department_id', staffData.department_id)
      .eq('visit.queue.status', 'completed')
      .order('created_at', { ascending: false });

    if (patientsError) {
      console.error('Patients fetch error:', patientsError);
      return res.status(500).json({ error: 'Failed to fetch patients' });
    }

    const uniquePatients = [];
    const seenPatientIds = new Set();

    patientsData.forEach(item => {
      const patientId = item.visit.outPatient.patient_id;
      if (!seenPatientIds.has(patientId)) {
        seenPatientIds.add(patientId);
        uniquePatients.push({
          patient_id: patientId,
          name: item.visit.outPatient.name,
          age: item.visit.outPatient.age,
          sex: item.visit.outPatient.sex,
          contact_no: item.visit.outPatient.contact_no,
          email: item.visit.outPatient.email,
          lastVisit: item.visit.visit_date,
          lastSymptoms: item.visit.symptoms,
          queueStatus: 'completed'
        });
      }
    });

    res.status(200).json({
      success: true,
      patients: uniquePatients,
      department: {
        id: staffData.department_id,
        specialization: staffData.specialization
      }
    });

  } catch (error) {
    console.error('My patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/healthcare/heartbeat', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }


    await supabase
      .from('staff')
      .update({ 
        last_activity: new Date().toISOString(),
        is_online: true
      })
      .eq('id', req.user.id);


    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patients diagnosed by this doctor today only
app.get('/api/healthcare/my-patients-today', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { date } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const filterDate = date || today;

    const { data: staffData } = await supabase
      .from('staff')
      .select('department_id, specialization')
      .eq('id', req.user.id)
      .single();

    if (!staffData) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const { data: myTodayPatients, error: patientsError } = await supabase
      .from('diagnosis')
      .select(`
        created_at,
        visit!inner(
          visit_id,
          visit_date,
          visit_time,
          symptoms,
          appointment_type,
          outpatient!inner(
            id,
            patient_id,
            name,
            age,
            sex,
            contact_no,
            email
          ),
          queue!inner(
            status,
            queue_no,
            department_id
          )
        )
      `)
      .eq('staff_id', req.user.id)
      .eq('visit.visit_date', filterDate)
      .eq('visit.queue.department_id', staffData.department_id)
      .order('created_at', { ascending: false });

    if (patientsError) {
      console.error('My today patients fetch error:', patientsError);
      return res.status(500).json({ error: 'Failed to fetch patients' });
    }

    const formattedPatients = (myTodayPatients || []).map(item => ({
      patient_id: item.visit.outPatient.patient_id,
      name: item.visit.outPatient.name,
      age: item.visit.outPatient.age,
      sex: item.visit.outPatient.sex,
      contact_no: item.visit.outPatient.contact_no,
      email: item.visit.outPatient.email,
      lastVisit: item.visit.visit_date,
      lastSymptoms: item.visit.symptoms,
      queueStatus: 'completed',
      queueNumber: item.visit.queue[0]?.queue_no,
      visitTime: item.visit.visit_time,
      isInQueue: false,
      diagnosedAt: item.created_at
    }));

    const uniquePatients = [];
    const seenPatientIds = new Set();

    formattedPatients.forEach(patient => {
      if (!seenPatientIds.has(patient.patient_id)) {
        seenPatientIds.add(patient.patient_id);
        uniquePatients.push(patient);
      }
    });

    res.status(200).json({
      success: true,
      patients: uniquePatients,
      department: {
        id: staffData.department_id,
        specialization: staffData.specialization
      },
      totalToday: uniquePatients.length
    });

  } catch (error) {
    console.error('My today patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patient history
app.get('/api/healthcare/patient-history/:patientId', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { patientId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { data: patientData, error: patientError } = await supabase
      .from('outpatient')
      .select(`
        id,
        patient_id,
        name,
        birthday,
        age,
        sex,
        address,
        contact_no,
        email,
        registration_date,
        emergency_contact(
          name,
          contact_number,
          relationship
        )
      `)
      .eq('patient_id', patientId)
      .single();

    if (patientError || !patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { data: visitHistory, error: visitError } = await supabase
      .from('visit')
      .select(`
        visit_id,
        visit_date,
        visit_time,
        appointment_type,
        symptoms,
        diagnosis(
          diagnosis_id,
          diagnosis_description,
          diagnosis_type,
          severity,
          notes,
          staff(
            name,
            specialization
          )
        ),
        queue(
          queue_no,
          status,
          department(
            name
          )
        )
      `)
      .eq('patient_id', patientData.id)
      .order('visit_date', { ascending: false })
      .order('visit_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (visitError) {
      console.error('Visit history error:', visitError);
      return res.status(500).json({ error: 'Failed to fetch visit history' });
    }

    const { count: totalVisits } = await supabase
      .from('visit')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patientData.id);

    res.status(200).json({
      success: true,
      patient: patientData,
      visitHistory: visitHistory || [],
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalVisits / limit),
        totalVisits: totalVisits || 0,
        hasNextPage: (page * limit) < totalVisits
      }
    });

  } catch (error) {
    console.error('Patient history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patient history by database ID (for admin/doctor viewing any patient)
app.get('/api/healthcare/patient-history-by-db-id/:patientDbId', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare' && req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { patientDbId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { data: patientData, error: patientError } = await supabase
      .from('outpatient')
      .select(`
        id,
        patient_id,
        name,
        birthday,
        age,
        sex,
        address,
        contact_no,
        email,
        registration_date,
        emergency_contact(
          name,
          contact_number,
          relationship
        )
      `)
      .eq('id', patientDbId)
      .single();

    if (patientError || !patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { data: visitHistory, error: visitError } = await supabase
      .from('visit')
      .select(`
        visit_id,
        visit_date,
        visit_time,
        appointment_type,
        symptoms,
        diagnosis(
          diagnosis_id,
          diagnosis_description,
          diagnosis_type,
          severity,
          notes,
          staff(
            name,
            role,
            specialization
          )
        ),
        queue(
          queue_no,
          status,
          department(
            name
          )
        ),
        lab_request(
          request_id,
          test_type,
          status,
          staff(
            name
          )
        )
      `)
      .eq('patient_id', patientData.id)
      .order('visit_date', { ascending: false })
      .order('visit_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (visitError) {
      console.error('Visit history error:', visitError);
      return res.status(500).json({ error: 'Failed to fetch visit history' });
    }

    const { count: totalVisits } = await supabase
      .from('visit')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patientData.id);

    res.status(200).json({
      success: true,
      patient: patientData,
      visitHistory: visitHistory || [],
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalVisits / limit),
        totalVisits: totalVisits || 0,
        hasNextPage: (page * limit) < totalVisits
      }
    });

  } catch (error) {
    console.error('Patient history by DB ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patient queue
app.get('/api/healthcare/patient-queue', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: staffData } = await supabase
      .from('staff')
      .select('department_id, specialization')
      .eq('id', req.user.id)
      .single();

    if (!staffData) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: queueData, error: queueError } = await supabase
      .from('queue')
      .select(`
        queue_id,
        queue_no,
        status,
        created_time,
        visit!inner(
          visit_id,
          symptoms,
          visit_date,
          visit_time,
          appointment_type,
          outpatient!inner(
            patient_id,
            name,
            age,
            sex,
            contact_no
          )
        ),
        department!inner(
          name
        )
      `)
      .eq('department_id', staffData.department_id)
      .eq('visit.visit_date', today)
      .order('queue_no', { ascending: true });

    // Check which completed patients were diagnosed by THIS doctor
    let diagnosedByMe = [];
    if (queueData && queueData.length > 0) {
      const completedVisitIds = queueData
        .filter(item => item.status === 'completed')
        .map(item => item.visit.visit_id);

      if (completedVisitIds.length > 0) {
        const { data: myDiagnoses } = await supabase
          .from('diagnosis')
          .select('visit_id')
          .eq('staff_id', req.user.id)
          .in('visit_id', completedVisitIds);

        diagnosedByMe = myDiagnoses?.map(d => d.visit_id) || [];
      }
    }

    const enhancedQueue = queueData?.map(item => ({
      ...item,
      diagnosedByMe: item.status === 'completed' && diagnosedByMe.includes(item.visit.visit_id)
    })) || [];

    res.status(200).json({
      success: true,
      queue: enhancedQueue,
      department: {
        id: staffData.department_id,
        specialization: staffData.specialization
      }
    });

  } catch (error) {
    console.error('Patient queue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update queue status
app.patch('/api/healthcare/queue/:queueId/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { queueId } = req.params;
    const { status, diagnosis_description, diagnosis_code, severity, notes } = req.body;

    if (!['waiting', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data: queueData, error: queueFetchError } = await supabase
      .from('queue')
      .select(`
        *,
        visit!inner(
          visit_id,
          patient_id,
          outpatient!inner(id, patient_id)
        )
      `)
      .eq('queue_id', queueId)
      .single();

    if (queueFetchError || !queueData) {
      return res.status(404).json({ error: 'Queue entry not found' });
    }

    const { data: updatedQueue, error: updateError } = await supabase
      .from('queue')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('queue_id', queueId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update queue status' });
    }

    let diagnosisData = null;
    let medicalRecordData = null;

    if (status === 'completed' && diagnosis_description) {
      const { data: newDiagnosis, error: diagnosisError } = await supabase
        .from('diagnosis')
        .insert({
          visit_id: queueData.visit.visit_id,
          patient_id: queueData.visit.outPatient.id,
          staff_id: req.user.id,
          diagnosis_code: diagnosis_code || 'Z00.00',
          diagnosis_description,
          diagnosis_type: 'primary',
          severity: severity || 'moderate',
          notes: notes || ''
        })
        .select()
        .single();

      if (!diagnosisError) {
        diagnosisData = newDiagnosis;

        const { data: newMedicalRecord, error: medicalRecordError } = await supabase
          .from('medical_record')
          .insert({
            patient_id: queueData.visit.outPatient.id,
            visit_id: queueData.visit.visit_id,
            result_id: null
          })
          .select()
          .single();

        if (!medicalRecordError) {
          medicalRecordData = newMedicalRecord;
        }
      }
    }

    res.status(200).json({
      success: true,
      queue: updatedQueue,
      diagnosis: diagnosisData,
      medicalRecord: medicalRecordData,
      message: 'Queue status updated successfully'
    });

  } catch (error) {
    console.error('Update queue status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/healthcare/logout', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }


    await supabase
      .from('staff')
      .update({ is_online: false })
      .eq('id', req.user.id);


    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const markInactiveStaffOffline = async () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  await supabase
    .from('staff')
    .update({ is_online: false })
    .lt('last_activity', fiveMinutesAgo)
    .eq('is_online', true);
};

setInterval(markInactiveStaffOffline, 2 * 60 * 1000);

// Visit/Appointment booking
app.post('/api/patient/visit', async (req, res) => {
  try {
    const {
      patient_id,
      symptoms,
      duration,
      severity,
      previous_treatment,
      allergies,
      medications,
      appointment_type
    } = req.body;

    if (!patient_id || !symptoms) {
      return res.status(400).json({ 
        error: 'Patient ID and symptoms are required' 
      });
    }

    const isRoutineCareOnly = hasOnlyRoutineCareSymptoms(symptoms);

    const { data: patientData, error: patientError } = await supabase
      .from('outpatient')
      .select('id, patient_id, name, age')
      .eq('patient_id', patient_id)
      .single();

    if (patientError || !patientData) {
      return res.status(404).json({ 
        error: 'Patient not found' 
      });
    }

    const visitData = {
      patient_id: patientData.id,
      visit_date: new Date().toISOString().split('T')[0],
      visit_time: new Date().toTimeString().split(' ')[0],
      appointment_type: appointment_type || 'Walk-in',
      symptoms: Array.isArray(symptoms) ? symptoms.join(', ') : symptoms,
      duration: isRoutineCareOnly ? null : duration,
      severity: isRoutineCareOnly ? null : severity,
      previous_treatment: previous_treatment || null,
      allergies: allergies || null,
      medications: medications || null
    };

    const { data: createdVisit, error: visitError } = await supabase
      .from('visit')
      .insert(visitData)
      .select()
      .single();

    if (visitError) {
      console.error('Visit creation error:', visitError);
      return res.status(500).json({ 
        error: 'Failed to create visit record',
        details: visitError.message 
      });
    }

    // Assign department based on symptoms
    const symptomsList = Array.isArray(symptoms) ? symptoms : symptoms.split(', ');
    const deptId = await assignDepartmentBySymptoms(symptomsList, patientData.age);

    const { data: deptData } = await supabase
      .from('department')
      .select('name')
      .eq('department_id', deptId)
      .single();

    const recommendedDepartment = deptData?.name || 'Internal Medicine';

    // Get next queue number for today in this department
    const today = new Date().toISOString().split('T')[0];
    const { data: existingQueues } = await supabase
      .from('queue')
      .select('queue_no, visit!inner(visit_date)')
      .eq('department_id', deptId)
      .eq('visit.visit_date', today);

    const maxQueueNo = existingQueues?.length > 0 
      ? Math.max(...existingQueues.map(q => q.queue_no)) 
      : 0;
    const queueNumber = maxQueueNo + 1;

    // Create queue entry
    const { data: queueData, error: queueError } = await supabase
      .from('queue')
      .insert({
        visit_id: createdVisit.visit_id,
        department_id: deptId,
        queue_no: queueNumber,
        status: 'waiting'
      })
      .select()
      .single();

    if (queueError) {
      console.error('Queue creation error:', queueError);
    }

    // Return complete response
    res.status(201).json({
      success: true,
      patient: patientData,
      visit: createdVisit,
      queue: queueData,
      recommendedDepartment: recommendedDepartment,
      queue_number: queueNumber,
      estimated_wait: '15-30 minutes',
      is_routine_care: isRoutineCareOnly,
      message: 'Appointment booked successfully'
    });

  } catch (error) {
    console.error('Visit booking error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Get profiles
app.get('/api/healthcare/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: staffData, error } = await supabase
      .from('staff')
      .select('id, staff_id, name, role, specialization, department_id, license_no, contact_no')
      .eq('id', req.user.id)
      .single();

    if (error || !staffData) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    res.json(staffData);
  } catch (error) {
    console.error('Get healthcare profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: adminData, error } = await supabase
      .from('admin')
      .select('id, healthadmin_id, name, position')
      .eq('id', req.user.id)
      .single();

    if (error || !adminData) {
      return res.status(404).json({
        error: 'Admin not found'
      });
    }

    res.status(200).json({
      success: true,
      admin: adminData
    });

  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Temporary registration functions
const generateTempPatientId = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TEMP${timestamp}${random}`;
};

const generateHealthAssessmentId = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `HEALTH${timestamp}${random}`;
};

// Cleanup expired registrations
const cleanupExpiredRegistrations = async () => {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    
    const { data: registrations, error: fetchError } = await supabase
      .from('pre_registration')
      .select('temp_id, temp_patient_id, name, preferred_date, preferred_time_slot, expires_at')
      .in('status', ['pending', 'completed']);

    if (fetchError) {
      console.error('Error fetching registrations for cleanup:', fetchError);
      return;
    }

    if (!registrations || registrations.length === 0) {
      return;
    }

    const expiredIds = [];
    
    registrations.forEach(reg => {
      const appointmentDate = reg.preferred_date;
      const timeSlot = reg.preferred_time_slot;
      
      if (!appointmentDate) return;
      
      if (appointmentDate < currentDate) {
        expiredIds.push(reg.temp_id);
        return;
      }
      
      if (appointmentDate === currentDate) {
        let hasExpired = false;
        
        switch (timeSlot) {
          case 'morning':
            hasExpired = currentHour >= 12;
            break;
          case 'afternoon':
            hasExpired = currentHour >= 17;
            break;
          case 'evening':
            hasExpired = currentHour >= 20;
            break;
          case 'anytime':
            hasExpired = currentHour >= 20;
            break;
          default:
            hasExpired = false;
        }
        
        if (hasExpired) {
          expiredIds.push(reg.temp_id);
        }
      }
    });

    if (expiredIds.length === 0) {
      return;
    }

    const { error: deleteError } = await supabase
      .from('pre_registration')
      .delete()
      .in('temp_id', expiredIds);

    if (deleteError) {
      console.error('Error deleting expired registrations:', deleteError);
      return;
    }
      
  } catch (error) {
    console.error('Cleanup job error:', error);
  }
};

const cleanupUnusedQueueAndVisits = async () => {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    
    console.log('🧹 Starting cleanup of unused queue/visit records...');

    // Step 1: Find expired queue records (waiting status past their time slot)
    const { data: expiredQueues, error: queueFetchError } = await supabase
      .from('queue')
      .select(`
        queue_id,
        status,
        created_time,
        visit!inner(
          visit_id,
          visit_date,
          visit_time,
          patient_id,
          outpatient!inner(
            id,
            patient_id,
            name
          )
        )
      `)
      .eq('status', 'waiting')
      .lt('visit.visit_date', currentDate); // Past dates

    if (queueFetchError) {
      console.error('❌ Error fetching expired queues:', queueFetchError);
      return;
    }

    // Also check today's queues that are past their time slot
    const { data: todayExpiredQueues } = await supabase
      .from('queue')
      .select(`
        queue_id,
        status,
        created_time,
        visit!inner(
          visit_id,
          visit_date,
          visit_time,
          patient_id,
          outpatient!inner(
            id,
            patient_id,
            name
          )
        )
      `)
      .eq('status', 'waiting')
      .eq('visit.visit_date', currentDate);

    // Filter today's queues by time (2 hours past their slot)
    const todayExpired = (todayExpiredQueues || []).filter(queue => {
      const visitTime = queue.visit.visit_time;
      const [hours, minutes] = visitTime.split(':').map(Number);
      
      const visitDateTime = new Date();
      visitDateTime.setHours(hours, minutes, 0, 0);
      const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
      
      return visitDateTime < twoHoursAgo;
    });

    const allExpiredQueues = [...(expiredQueues || []), ...todayExpired];

    if (allExpiredQueues.length === 0) {
      console.log('✅ No expired queue records to clean');
      return;
    }

    console.log(`📊 Found ${allExpiredQueues.length} expired queue records`);

    // Step 2: Process each expired queue
    for (const queue of allExpiredQueues) {
      const patientDbId = queue.visit.patient_id;
      const visitId = queue.visit.visit_id;
      const queueId = queue.queue_id;
      const patientName = queue.visit.outpatient.name;

      // Check if this patient has ANY completed visits (visits with diagnosis)
      const { data: completedVisits, error: completedError } = await supabase
        .from('diagnosis')
        .select('visit_id, visit!inner(patient_id)')
        .eq('visit.patient_id', patientDbId);

      if (completedError) {
        console.error(`❌ Error checking completed visits for patient ${patientDbId}:`, completedError);
        continue;
      }

      // Check if current visit has diagnosis
      const currentVisitHasDiagnosis = completedVisits?.some(d => d.visit_id === visitId);

      if (currentVisitHasDiagnosis) {
        // This visit was completed, don't delete anything
        console.log(`✅ Visit ${visitId} was completed - keeping record`);
        continue;
      }

      // Check if patient has OTHER completed visits (excluding current one)
      const hasOtherCompletedVisits = completedVisits?.some(d => d.visit_id !== visitId);

      if (hasOtherCompletedVisits) {
        // RETURNING PATIENT: Has past successful visits
        // Delete only the unused queue and visit
        console.log(`🔄 Returning patient "${patientName}" - deleting unused visit/queue only`);

        // Delete queue
        await supabase
          .from('queue')
          .delete()
          .eq('queue_id', queueId);

        // Delete visit
        await supabase
          .from('visit')
          .delete()
          .eq('visit_id', visitId);

        console.log(`✅ Deleted unused visit/queue for returning patient "${patientName}"`);

      } else {
        // NEW PATIENT: No past successful visits
        // Delete EVERYTHING including personal info
        console.log(`🆕 New patient "${patientName}" never showed up - deleting all records`);

        // Delete in order due to foreign key constraints
        
        // 1. Delete queue
        await supabase
          .from('queue')
          .delete()
          .eq('queue_id', queueId);

        // 2. Delete visit
        await supabase
          .from('visit')
          .delete()
          .eq('visit_id', visitId);

        // 3. Delete any OTP records
        await supabase
          .from('otp_verification')
          .delete()
          .eq('patient_id', queue.visit.outpatient.patient_id);

        // 4. Delete emergency contact
        await supabase
          .from('emergency_contact')
          .delete()
          .eq('patient_id', patientDbId);

        // 5. Delete health questionnaire if exists
        await supabase
          .from('health_questionnaire')
          .delete()
          .eq('patient_id', patientDbId);

        // 6. Finally delete patient record
        const { error: deletePatientError } = await supabase
          .from('outpatient')
          .delete()
          .eq('id', patientDbId);

        if (deletePatientError) {
          console.error(`❌ Error deleting patient record:`, deletePatientError);
        } else {
          console.log(`✅ Completely removed new patient "${patientName}" (ID: ${queue.visit.outpatient.patient_id})`);
        }
      }
    }

    console.log(`✅ Cleanup completed successfully`);
    
  } catch (error) {
    console.error('💥 Cleanup job error:', error);
  }
};

const cleanupExpiredHealthAssessments = async () => {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    
    const { data: assessments, error: fetchError } = await supabase
      .from('health_questionnaire')
      .select('assessment_id, temp_assessment_id, preferred_date, preferred_time_slot, expires_at')
      .in('status', ['pending']);

    if (fetchError) {
      console.error('Error fetching health assessments for cleanup:', fetchError);
      return;
    }

    if (!assessments || assessments.length === 0) {
      return;
    }

    const expiredIds = [];
    
    assessments.forEach(assessment => {
      const appointmentDate = assessment.preferred_date;
      const timeSlot = assessment.preferred_time_slot;
      
      if (!appointmentDate) return;
      
      if (appointmentDate < currentDate) {
        expiredIds.push(assessment.assessment_id);
        return;
      }
      
      if (appointmentDate === currentDate) {
        let hasExpired = false;
        
        switch (timeSlot) {
          case 'morning':
            hasExpired = currentHour >= 12;
            break;
          case 'afternoon':
            hasExpired = currentHour >= 17;
            break;
          case 'evening':
            hasExpired = currentHour >= 20;
            break;
          case 'anytime':
            hasExpired = currentHour >= 20;
            break;
          default:
            hasExpired = false;
        }
        
        if (hasExpired) {
          expiredIds.push(assessment.assessment_id);
        }
      }
    });

    if (expiredIds.length === 0) {
      return;
    }

    const { error: deleteError } = await supabase
      .from('health_questionnaire')
      .delete()
      .in('assessment_id', expiredIds);

    if (deleteError) {
      console.error('Error deleting expired health assessments:', deleteError);
      return;
    }
      
  } catch (error) {
console.error('Health assessment cleanup job error:', error);
  }
};

// Run cleanup every 30 minutes
setInterval(cleanupExpiredRegistrations, 30 * 60 * 1000);
setInterval(cleanupExpiredHealthAssessments, 30 * 60 * 1000);
setInterval(cleanupUnusedQueueAndVisits, 30 * 60 * 1000);

// Run cleanup on server start
cleanupExpiredRegistrations();
cleanupExpiredHealthAssessments();
cleanupUnusedQueueAndVisits();

// Manual cleanup endpoint
app.post('/api/admin/cleanup-expired', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await cleanupExpiredRegistrations();
    
    res.json({
      success: true,
      message: 'Cleanup completed successfully'
    });
    
  } catch (error) {
    console.error('Manual cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// Appointment date validation
const validateAppointmentDate = (preferredDate) => {
  if (!preferredDate) return null;
  
  const appointmentDate = new Date(preferredDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  oneYearFromNow.setHours(0, 0, 0, 0);
  
  if (appointmentDate < today) {
    return 'Appointment date cannot be in the past';
  }
  
  if (appointmentDate > oneYearFromNow) {
    return 'Appointment date cannot be more than 1 year from now';
  }
  
  return null;
};

// Temporary registration
app.post('/api/temp-registration', async (req, res) => {
  try {
    console.log('📝 Temp registration request:', req.body);
          
    const {
      name, birthday, age, sex, address, contact_no, email,
      emergency_contact_name, emergency_contact_relationship, emergency_contact_no,
      symptoms, duration, severity, previous_treatment, allergies, medications,
      preferred_date, preferred_time_slot, scheduled_date, status, expires_at
    } = req.body;

    // Check for duplicates BEFORE processing
    const duplicateCheck = await checkDuplicateUser(email, contact_no);
    if (duplicateCheck.isDuplicate) {
      return res.status(400).json({
        error: duplicateCheck.message,
        field: duplicateCheck.field
      });
    }

    if (preferred_date) {
      const dateValidationError = validateAppointmentDate(preferred_date);
      if (dateValidationError) {
        return res.status(400).json({
          error: dateValidationError
        });
      }
    }

    // Generate temp patient ID
    const temp_patient_id = generateTempPatientId();

    // Insert into tempReg table
    const { data: tempRegData, error: tempRegError } = await supabase
      .from('pre_registration')
      .insert({
        name,
        birthday,
        age: parseInt(age),
        sex,
        address,
        contact_no: contact_no.replace(/\D/g, ''), // Clean phone number
        email: email.toLowerCase(),
        emergency_contact_name,
        emergency_contact_relationship,
        emergency_contact_no: emergency_contact_no ? emergency_contact_no.replace(/\D/g, '') : null,
        symptoms,
        duration,
        severity,
        previous_treatment,
        allergies,
        medications,
        preferred_date,
        preferred_time_slot,
        scheduled_date,
        status: status || 'completed',
        expires_at,
        temp_patient_id,
        created_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (tempRegError) {
      console.error('💥 Temp registration error:', tempRegError);
      
      return res.status(500).json({
        error: 'Registration failed. Please try again.',
        details: tempRegError.message
      });
    }

    console.log('✅ Temp registration created:', tempRegData.name, 'ID:', tempRegData.temp_patient_id);

    res.status(201).json({
      success: true,
      message: 'Temporary registration created successfully',
      temp_id: tempRegData.temp_id,
      temp_patient_id: tempRegData.temp_patient_id
    });

  } catch (error) {
    console.error('💥 Temp registration error:', error);
    res.status(500).json({
      error: 'Registration failed. Please try again.',
      details: error.message
    });
  }
});

// Health assessment creation
app.post('/api/health-assessment', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'outpatient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      symptoms,
      duration,
      severity,
      previous_treatment,
      allergies,
      medications,
      preferred_date,
      preferred_time_slot
    } = req.body;

    if (!symptoms || !preferred_date || !preferred_time_slot) {
      return res.status(400).json({
        error: 'Symptoms, preferred date and time slot are required'
      });
    }

    const isRoutineCareOnly = hasOnlyRoutineCareSymptoms(symptoms);
    
    if (!isRoutineCareOnly && (!duration || !severity)) {
      return res.status(400).json({
        error: 'Duration and severity are required for non-routine care symptoms'
      });
    }

    const { data: patientData, error: patientError } = await supabase
      .from('outpatient')
      .select('id, patient_id, name, email')
      .eq('patient_id', req.user.patientId)
      .single();

    if (patientError || !patientData) {
      return res.status(404).json({
        error: 'Patient not found'
      });
    }

    const temp_assessment_id = generateHealthAssessmentId();
    
    const appointmentDate = new Date(preferred_date);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    
    const expires_at = appointmentDate > tomorrow ? tomorrow : new Date(appointmentDate.getTime() + 24 * 60 * 60 * 1000);

    const assessmentData = {
      patient_id: patientData.id,
      temp_assessment_id,
      symptoms: Array.isArray(symptoms) ? symptoms.join(', ') : symptoms,
      duration: isRoutineCareOnly ? null : duration,
      severity: isRoutineCareOnly ? null : severity,
      previous_treatment,
      allergies,
      medications,
      preferred_date,
      preferred_time_slot,
      status: 'pending',
      expires_at: expires_at.toISOString()
    };

    const { data: createdAssessment, error: assessmentError } = await supabase
      .from('health_questionnaire')
      .insert(assessmentData)
      .select()
      .single();

    if (assessmentError) {
      console.error('Health assessment creation error:', assessmentError);
      return res.status(500).json({
        error: 'Failed to create health assessment',
        details: assessmentError.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Health assessment created successfully',
      assessment_id: createdAssessment.assessment_id,
      temp_assessment_id: createdAssessment.temp_assessment_id,
      is_routine_care: isRoutineCareOnly
    });

  } catch (error) {
    console.error('Health assessment creation error:', error);
    res.status(500).json({
      error: 'Failed to create health assessment',
      details: error.message
    });
  }
});

// Update temp registration with health assessment
app.put('/api/temp-registration/:id/health-assessment', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      symptoms,
      duration,
      severity,
      previous_treatment,
      allergies,
      medications,
      preferred_date,
      preferred_time_slot,
      scheduled_date,
      status
    } = req.body;

    const { data: updatedData, error: updateError } = await supabase
      .from('pre_registration')
      .update({
        symptoms,
        duration,
        severity,
        previous_treatment,
        allergies,
        medications,
        preferred_date,
        preferred_time_slot,
        scheduled_date,
        status: status || 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('temp_id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Health assessment update error:', updateError);
      return res.status(500).json({
        error: 'Failed to update health assessment. Please try again.',
        details: updateError.message
      });
    }

    if (!updatedData) {
      return res.status(404).json({
        error: 'Registration not found'
      });
    }

    res.json({
      success: true,
      message: 'Health assessment updated successfully',
      data: updatedData
    });

  } catch (error) {
    console.error('Health assessment update error:', error);
    res.status(500).json({
      error: 'Failed to update health assessment. Please try again.',
      details: error.message
    });
  }
});

// Get health assessment
app.get('/api/health-assessment/:tempAssessmentId', async (req, res) => {
  try {
    const { tempAssessmentId } = req.params;
    
    const { data: assessmentData, error: assessmentError } = await supabase
      .from('health_questionnaire')
      .select(`
        *,
        outpatient!inner(
          patient_id,
          name,
          email,
          contact_no,
          age
        )
      `)
      .eq('temp_assessment_id', tempAssessmentId)
      .eq('status', 'pending')
      .single();

    if (assessmentError || !assessmentData) {
      return res.status(404).json({
        success: false,
        error: 'Health assessment not found or expired'
      });
    }

    const now = new Date();
    const expiresAt = new Date(assessmentData.expires_at);
    
    if (now > expiresAt) {
      await supabase
        .from('health_questionnaire')
        .delete()
        .eq('assessment_id', assessmentData.assessment_id);
      
      return res.status(404).json({
        success: false,
        error: 'Health assessment has expired'
      });
    }

    res.json({
      success: true,
      assessment: {
        temp_assessment_id: assessmentData.temp_assessment_id,
        symptoms: assessmentData.symptoms,
        duration: assessmentData.duration,
        severity: assessmentData.severity,
        previous_treatment: assessmentData.previous_treatment,
        allergies: assessmentData.allergies,
        medications: assessmentData.medications,
        preferred_date: assessmentData.preferred_date,
        preferred_time_slot: assessmentData.preferred_time_slot,
        expires_at: assessmentData.expires_at,
        patient: {
          patient_id: assessmentData.outPatient.patient_id,
          name: assessmentData.outPatient.name,
          email: assessmentData.outPatient.email,
          contact_no: assessmentData.outPatient.contact_no,
          age: assessmentData.outPatient.age
        }
      }
    });

  } catch (error) {
    console.error('Get health assessment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Generate health assessment QR
app.post('/api/generate-health-assessment-qr', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'outpatient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { temp_assessment_id } = req.body;

    if (!temp_assessment_id) {
      return res.status(400).json({
        error: 'Assessment ID is required'
      });
    }

    const { data: assessmentData, error: assessmentError } = await supabase
      .from('health_questionnaire')
      .select(`
        *,
        outpatient!inner(
          patient_id,
          name,
          email,
          age,
          sex,
          contact_no,
          address,
          birthday,
          registration_date
        )
      `)
      .eq('temp_assessment_id', temp_assessment_id)
      .eq('status', 'pending')
      .single();

    if (assessmentError || !assessmentData) {
      return res.status(404).json({
        error: 'Health assessment not found or expired'
      });
    }

    const { data: tokenPatientData } = await supabase
      .from('outpatient')
      .select('id, patient_id')
      .eq('patient_id', req.user.patientId)
      .single();

    if (!tokenPatientData || assessmentData.patient_id !== tokenPatientData.id) {
      return res.status(403).json({
        error: 'This health assessment does not belong to your account'
      });
    }

    const symptomsList = assessmentData.symptoms ? assessmentData.symptoms.split(', ') : [];
    const deptId = await assignDepartmentBySymptoms(symptomsList, assessmentData.outPatient.age);

    const { data: deptData } = await supabase
      .from('department')
      .select('name')
      .eq('department_id', deptId)
      .single();

    const recommendedDepartment = deptData?.name || 'Internal Medicine';

    const qrData = {
      type: 'health_assessment',
      tempAssessmentId: temp_assessment_id,
      patientId: assessmentData.outPatient.patient_id,
      patientName: assessmentData.outPatient.name,
      department: recommendedDepartment,
      scheduledDate: assessmentData.preferred_date,
      preferredTime: assessmentData.preferred_time_slot,
      symptoms: assessmentData.symptoms,
      severity: assessmentData.severity,
      duration: assessmentData.duration,
      previousTreatment: assessmentData.previous_treatment,
      allergies: assessmentData.allergies,
      medications: assessmentData.medications,
      timestamp: new Date().toISOString(),
      expiresAt: assessmentData.expires_at,
      patientEmail: assessmentData.outPatient.email,
      patientPhone: assessmentData.outPatient.contact_no
    };

    let qrCodeDataURL;
    try {
      const qrString = JSON.stringify(qrData);
      qrCodeDataURL = await QRCode.toDataURL(qrString, {
        width: 256,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (qrError) {
      console.error('QR generation failed:', qrError.message);
      return res.status(500).json({
        error: 'QR code generation failed',
        details: qrError.message
      });
    }

    try {
      const transporter = nodemailer.createTransporter(emailConfig);
      await transporter.verify();

      const patientName = assessmentData.outPatient.name;
      const patientEmail = assessmentData.outPatient.email;
      
      const appointmentDate = assessmentData.preferred_date ? 
        new Date(assessmentData.preferred_date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'Not specified';

      const appointmentTime = assessmentData.preferred_time_slot || 'Not specified';

      let qrCodeBuffer;
      try {
        const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
        qrCodeBuffer = Buffer.from(base64Data, 'base64');
      } catch (bufferError) {
        console.error('Health assessment buffer conversion failed:', bufferError.message);
        return res.status(500).json({
          error: 'Image processing failed',
          details: bufferError.message
        });
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: patientEmail,
        subject: 'CliCare - Your Health Assessment QR Code',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 28px;">CliCare Hospital</h1>
                <p style="color: #6b7280; margin: 5px 0 0 0;">Your Health Assessment QR Code</p>
              </div>

              <div style="margin-bottom: 25px;">
                <h2 style="color: #27371f; margin: 0 0 10px 0;">Hello ${patientName},</h2>
                <p style="color: #4b5563; line-height: 1.6; margin: 0;">
                  Your health assessment has been successfully submitted. Please present the QR code below when you arrive at the hospital for faster check-in.
                </p>
              </div>

              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #27371f; margin: 0 0 15px 0; font-size: 18px;">Assessment Details</h3>
                <div style="display: grid; gap: 10px;">
                  <div><strong>Assessment ID:</strong> ${temp_assessment_id}</div>
                  <div><strong>Patient ID:</strong> ${assessmentData.outPatient.patient_id}</div>
                  <div><strong>Recommended Department:</strong> ${recommendedDepartment}</div>
                  <div><strong>Preferred Date:</strong> ${appointmentDate}</div>
                  <div><strong>Preferred Time:</strong> ${appointmentTime}</div>
                  <div><strong>Symptoms:</strong> ${assessmentData.symptoms || 'Not specified'}</div>
                  <div><strong>Severity:</strong> ${assessmentData.severity || 'Not specified'}</div>
                </div>
              </div>

              <div style="text-align: center; margin-bottom: 25px;">
                <h3 style="color: #27371f; margin: 0 0 15px 0;">Your QR Code</h3>
                <div style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 10px; padding: 20px; display: inline-block;">
                  <img src="cid:healthqrcode" alt="Health Assessment QR Code" style="max-width: 200px; height: auto;" />
                </div>
                <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">
                  Present this QR code at the hospital kiosk or reception desk
                </p>
              </div>

              <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 20px;">
                <h4 style="color: #1e40af; margin: 0 0 10px 0;">Instructions</h4>
                <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
                  <li>Present this QR code when you arrive at CliCare Hospital</li>
                  <li>You can scan this at the kiosk or show it to the reception staff</li>
                  <li>This QR code is valid until ${new Date(assessmentData.expires_at).toLocaleDateString()}</li>
                  <li>Bring a valid ID for verification</li>
                </ul>
              </div>

              <div style="background-color: #fef3cd; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
                <h4 style="color: #92400e; margin: 0 0 10px 0;">Important</h4>
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  This QR code is personalized for <strong>${patientName}</strong> (Patient ID: ${assessmentData.outPatient.patient_id}). 
                  It cannot be used by other patients and will expire on ${new Date(assessmentData.expires_at).toLocaleDateString()}.
                </p>
              </div>

              <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  If you have any questions, please contact CliCare Hospital<br>
                  This is an automated message, please do not reply to this email.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                  CliCare Hospital Management System
                </p>
              </div>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: 'health-assessment-qr.png',
            content: qrCodeBuffer,
            cid: 'healthqrcode'
          }
        ]
      };

      const emailResult = await transporter.sendMail(mailOptions);

    } catch (emailError) {
      console.error('Health assessment email sending failed:', emailError.message);
      
      return res.json({
        success: true,
        message: 'Health assessment QR code generated successfully, but email delivery failed',
        temp_assessment_id: temp_assessment_id,
        recommended_department: recommendedDepartment,
        qrCodeDataURL: qrCodeDataURL,
        qr_type: 'health_assessment',
        emailError: 'Email delivery failed - please save the QR code from this response'
      });
    }

    res.json({
      success: true,
      message: 'Health assessment QR code generated and sent successfully',
      temp_assessment_id: temp_assessment_id,
      recommended_department: recommendedDepartment,
      qrCodeDataURL: qrCodeDataURL,
      qr_type: 'health_assessment'
    });

  } catch (error) {
    console.error('Health assessment QR generation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Debug token endpoint
app.get('/api/debug/token', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    message: 'Token is valid'
  });
});

// Generate QR email
app.post('/api/generate-qr-email', async (req, res) => {
  try {
    console.log('📧 QR generation request received');
    
    const { qrData, patientEmail, patientName } = req.body;

    // Validate input
    if (!qrData || !patientEmail || !patientName) {
      console.error('Missing required data:', { qrData: !!qrData, patientEmail: !!patientEmail, patientName: !!patientName });
      return res.status(400).json({
        error: 'Missing required data for QR generation'
      });
    }

    // Step 1: Generate QR code
    console.log('Step 1: Generating QR code...');
    let qrCodeDataURL;
    try {
      const qrString = JSON.stringify(qrData);
      console.log('QR data string length:', qrString.length);
      
      qrCodeDataURL = await QRCode.toDataURL(qrString, {
        width: 256,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      console.log('✅ QR code generated successfully');
    } catch (qrError) {
      console.error('❌ QR generation failed:', qrError.message);
      return res.status(500).json({
        error: 'QR code generation failed',
        details: qrError.message
      });
    }

    // Step 2: Convert to buffer
    console.log('Step 2: Converting to buffer...');
    let qrCodeBuffer;
    try {
      const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
      qrCodeBuffer = Buffer.from(base64Data, 'base64');
      console.log('✅ Buffer created, size:', qrCodeBuffer.length, 'bytes');
    } catch (bufferError) {
      console.error('❌ Buffer conversion failed:', bufferError.message);
      return res.status(500).json({
        error: 'Image processing failed',
        details: bufferError.message
      });
    }

    // Step 3: Prepare email
    console.log('Step 3: Preparing email...');
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
        <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #4285f4 0%, #1a73e8 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🏥 CliCare Hospital</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Registration Confirmation</p>
          </div>
          
          <div style="padding: 30px;">
            <h2 style="color: #333; margin-top: 0;">Hello ${patientName},</h2>
            <p style="color: #666; line-height: 1.6; font-size: 16px;">Your registration has been completed successfully! Please present the QR code below when you arrive at the hospital.</p>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; margin: 25px 0; border: 2px dashed #dee2e6;">
              <img src="cid:qrcode" alt="Registration QR Code" style="max-width: 200px; height: auto; border: 1px solid #ddd; border-radius: 4px;">
              <p style="color: #666; font-size: 14px; margin: 15px 0 0 0; font-weight: 500;">Present this QR code at registration</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #1a73e8; margin-top: 0; font-size: 18px;">📋 Appointment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; color: #666; font-weight: 600;">Department:</td>
                  <td style="padding: 10px 0; color: #333;">${qrData.department || 'General Practice'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; color: #666; font-weight: 600;">Date:</td>
                  <td style="padding: 10px 0; color: #333;">${qrData.scheduledDate || 'To be confirmed'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; color: #666; font-weight: 600;">Time:</td>
                  <td style="padding: 10px 0; color: #333;">${qrData.preferredTime || 'To be confirmed'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #666; font-weight: 600;">Temp ID:</td>
                  <td style="padding: 10px 0; color: #333; font-family: monospace;">${qrData.tempPatientId || 'N/A'}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3;">
              <h4 style="margin-top: 0; color: #1565c0; font-size: 16px;">📝 What to do next:</h4>
              <ol style="color: #666; margin: 10px 0 0 0; padding-left: 20px; line-height: 1.6;">
                <li>Arrive 15 minutes before your scheduled time</li>
                <li>Go directly to the registration desk</li>
                <li>Show this QR code to the staff</li>
                <li>Wait for your queue number to be called</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This is an automated message from CliCare Hospital<br>
                Please do not reply to this email
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Step 4: Send email
    console.log('Step 4: Sending email to:', patientEmail);
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      
      // Verify connection
      await transporter.verify();
      console.log('✅ Email transport verified');
      
      const mailOptions = {
        from: `"CliCare Hospital" <${process.env.EMAIL_USER}>`,
        to: patientEmail,
        subject: `Your CliCare Registration QR Code - ${patientName}`,
        html: emailHtml,
        attachments: [
          {
            filename: 'qr-code.png',
            content: qrCodeBuffer,
            cid: 'qrcode'
          }
        ]
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully. Message ID:', result.messageId);

    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      return res.status(500).json({
        error: 'Failed to send email',
        details: emailError.message
      });
    }

    // Step 5: Update database (optional)
    try {
      await supabase
        .from('pre_registration')
        .update({ 
          qr_code: JSON.stringify(qrData),
          updated_at: new Date().toISOString()
        })
        .eq('temp_patient_id', qrData.tempPatientId);
      console.log('✅ Database updated');
    } catch (dbError) {
      console.warn('⚠️ Database update failed (non-critical):', dbError.message);
    }

    console.log('🎉 QR generation and email process completed successfully');

    res.json({
      success: true,
      message: 'QR code generated and sent successfully to ' + patientEmail,
      qrCodeDataURL: qrCodeDataURL
    });

  } catch (error) {
    console.error('💥 Unexpected error in QR generation:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get temp registration
app.get('/api/temp-registration/:tempPatientId', async (req, res) => {
  try {
    const { tempPatientId } = req.params;
    
    const { data: regData, error: regError } = await supabase
      .from('pre_registration')
      .select('*')
      .eq('temp_patient_id', tempPatientId)
      .in('status', ['completed', 'pending'])
      .single();
    
    if (regError || !regData) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found or expired'
      });
    }

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentHour = now.getHours();

    if (regData.expires_at) {
      const expiresAt = new Date(regData.expires_at);
      if (now > expiresAt) {
        await supabase.from('pre_registration').delete().eq('temp_id', regData.temp_id);
        return res.status(404).json({
          success: false,
          error: 'Registration has expired'
        });
      }
    }

    if (regData.preferred_date) {
      const appointmentDate = regData.preferred_date;
      const timeSlot = regData.preferred_time_slot;
      
      let hasExpired = false;
      
      if (appointmentDate < currentDate) {
        hasExpired = true;
      }
      else if (appointmentDate === currentDate && timeSlot) {
        switch (timeSlot) {
          case 'morning':
            hasExpired = currentHour >= 12;
            break;
          case 'afternoon':
            hasExpired = currentHour >= 17;
            break;
          case 'evening':
            hasExpired = currentHour >= 20;
            break;
          case 'anytime':
            hasExpired = currentHour >= 20;
            break;
        }
      }
      
      if (hasExpired) {
        await supabase.from('pre_registration').delete().eq('temp_id', regData.temp_id);
        return res.status(404).json({
          success: false,
          error: 'Registration appointment time has passed'
        });
      }
    }
    
    res.json({
      success: true,
      data: regData,
      qr_type: 'registration'
    });
    
  } catch (error) {
    console.error('Get registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve registration details',
      details: error.message
    });
  }
});

// Delete temp registration
app.delete('/api/temp-registration/:tempId', async (req, res) => {
  try {
    const { tempId } = req.params;
    
    const { error: deleteError } = await supabase
      .from('pre_registration')
      .delete()
      .eq('temp_id', tempId);

    if (deleteError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete temporary registration',
        details: deleteError.message
      });
    }

    res.json({
      success: true,
      message: 'Temporary registration deleted successfully'
    });

  } catch (error) {
    console.error('Delete temp registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'CliCare Admin Backend is running',
    timestamp: new Date().toISOString(),
    env: {
      emailConfigured: !!process.env.EMAIL_USER,
      smsConfigured: isSMSConfigured,
      supabaseConfigured: !!SUPABASE_URL,
      smsProvider: 'iTexMo'
    }
  });
});

// Patient endpoints
app.get('/api/patient/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'outpatient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: patientData, error: patientError } = await supabase
      .from('outpatient')
      .select(`
        *,
        emergency_contact(
          name,
          contact_number,
          relationship
        )
      `)
      .eq('patient_id', req.user.patientId)
      .single();

    if (patientError || !patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.status(200).json({
      success: true,
      patient: patientData
    });

  } catch (error) {
    console.error('Patient profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/patient/history/:patientId', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'outpatient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { patientId } = req.params;
    
    const { data: patientData } = await supabase
      .from('outpatient')
      .select('id')
      .eq('patient_id', patientId)
      .single();

    if (!patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { data: visitHistory, error: visitError } = await supabase
      .from('visit')
      .select(`
        visit_id,
        visit_date,
        visit_time,
        appointment_type,
        symptoms,
        diagnosis(
          diagnosis_description,
          severity
        ),
        queue(
          queue_no,
          status,
          department(name)
        )
      `)
      .eq('patient_id', patientData.id)
      .order('visit_date', { ascending: false });

    res.status(200).json({
      success: true,
      visitHistory: visitHistory || []
    });

  } catch (error) {
    console.error('Patient history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lab-related endpoints
app.get('/api/healthcare/lab-requests', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // ✅ FIX: Correct query with proper table names
    const { data: labRequests, error: labRequestsError } = await supabase
      .from('lab_request')  // ✅ snake_case
      .select(`
        *,
        visit!inner(
          visit_id,
          visit_date,
          outpatient!inner(
            patient_id,
            name,
            age,
            sex,
            contact_no
          )
        )
      `)
      .eq('staff_id', req.user.id)
      .order('request_id', { ascending: false });

    if (labRequestsError) {
      console.error('Lab requests fetch error:', labRequestsError);
      return res.status(500).json({ error: 'Failed to fetch lab requests' });
    }

    const requestIds = (labRequests || []).map(req => req.request_id);
    let allResults = [];
    
    if (requestIds.length > 0) {
      const { data: resultsData } = await supabase
        .from('lab_result')
        .select('*')
        .in('request_id', requestIds)
        .order('upload_date', { ascending: true });
      
      allResults = resultsData || [];
    }

    const resultsByRequest = allResults.reduce((acc, result) => {
      if (!acc[result.request_id]) {
        acc[result.request_id] = [];
      }
      acc[result.request_id].push(result);
      return acc;
    }, {});

    // ✅ FIX: Add null checks
    const formattedRequests = (labRequests || []).map(request => {
      const results = resultsByRequest[request.request_id] || [];
      let resultData = null;
      let hasMultipleTests = false;

      const testTypes = request.test_type.split(', ').map(t => t.trim());
      hasMultipleTests = testTypes.length > 1;

      if (results.length > 0) {
        if (hasMultipleTests && results.length > 1) {
          resultData = {
            isMultiple: true,
            files: results.map((result, index) => {
              let testName = 'Unknown Test';
              let originalFileName = 'uploaded_file';
              
              try {
                const parsedResults = JSON.parse(result.results);
                testName = parsedResults.testName || testTypes[index] || `Test ${index + 1}`;
                originalFileName = parsedResults.originalName || result.file_path?.split('/').pop() || 'uploaded_file';
              } catch (e) {
                testName = testTypes[index] || `Test ${index + 1}`;
                originalFileName = result.file_path?.split('/').pop() || 'uploaded_file';
              }

              return {
                result_id: result.result_id,
                file_name: originalFileName,
                file_url: result.file_path,
                upload_date: result.upload_date,
                testName: testName,
                testType: testTypes[index] || 'Unknown Type'
              };
            }),
            upload_date: results[0].upload_date,
            totalFiles: results.length
          };
        } else {
          const result = results[0];
          let testName = request.test_type;
          let originalFileName = 'uploaded_file';
          
          try {
            const parsedResults = JSON.parse(result.results);
            testName = parsedResults.testName || request.test_type;
            originalFileName = parsedResults.originalName || result.file_path?.split('/').pop() || 'uploaded_file';
          } catch (e) {
            originalFileName = result.file_path?.split('/').pop() || 'uploaded_file';
          }

          resultData = {
            isMultiple: false,
            result_id: result.result_id,
            file_name: originalFileName,
            file_url: result.file_path,
            upload_date: result.upload_date,
            testName: testName,
            results: result.results
          };
        }
      }

      // ✅ FIX: Add null checks for nested properties
      return {
        request_id: request.request_id,
        test_name: request.test_type,
        test_type: request.test_type,
        priority: 'normal',
        status: request.status,
        instructions: '',
        due_date: request.due_date,
        created_at: request.visit?.visit_date || new Date().toISOString(),  // ✅ Added fallback
        hasMultipleTests: hasMultipleTests,
        expectedFileCount: testTypes.length,
        uploadedFileCount: results.length,
        patient: {
          patient_id: request.visit?.outpatient?.patient_id || 'Unknown',  // ✅ Added optional chaining
          name: request.visit?.outpatient?.name || 'Unknown',
          age: request.visit?.outpatient?.age || 0,
          sex: request.visit?.outpatient?.sex || 'Unknown',
          contact_no: request.visit?.outpatient?.contact_no || 'Unknown'
        },
        labResult: resultData
      };
    });

    res.status(200).json({
      success: true,
      labRequests: formattedRequests
    });

  } catch (error) {
    console.error('Get lab requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/healthcare/lab-results', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // ✅ FIX: Correct query with proper table names
    const { data: labResults, error: labResultsError } = await supabase
      .from('lab_result')
      .select(`
        *,
        lab_request!inner(
          request_id,
          test_type,
          staff_id,
          visit!inner(
            visit_id,
            visit_date,
            outpatient!inner(
              patient_id,
              name,
              age,
              sex,
              contact_no
            )
          )
        )
      `)
      .eq('lab_request.staff_id', req.user.id)
      .order('upload_date', { ascending: false });

    if (labResultsError) {
      console.error('Lab results fetch error:', labResultsError);
      return res.status(500).json({ error: 'Failed to fetch lab results' });
    }

    // ✅ FIX: Add null checks
    const formattedResults = (labResults || []).map(result => ({
      result_id: result.result_id,
      request_id: result.request_id,
      file_name: result.file_path ? result.file_path.split('/').pop() : 'Unknown File',
      file_url: result.file_path,
      upload_date: result.upload_date,
      results: result.results,
      interpretation: result.interpretation,
      test_type: result.lab_request?.test_type || 'Unknown',  // ✅ Added optional chaining
      patient: {
        patient_id: result.lab_request?.visit?.outpatient?.patient_id || 'Unknown',
        name: result.lab_request?.visit?.outpatient?.name || 'Unknown',
        age: result.lab_request?.visit?.outpatient?.age || 0,
        sex: result.lab_request?.visit?.outpatient?.sex || 'Unknown',
        contact_no: result.lab_request?.visit?.outpatient?.contact_no || 'Unknown'
      },
      visit_date: result.lab_request?.visit?.visit_date || null
    }));

    res.status(200).json({
      success: true,
      labResults: formattedResults
    });

  } catch (error) {
    console.error('Get lab results error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/patient/lab-requests/:patientId', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'outpatient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { patientId } = req.params;

    if (req.user.patientId !== patientId) {
      return res.status(403).json({ error: 'Access denied to other patient data' });
    }

    const { data: patientData } = await supabase
      .from('outpatient')
      .select('id, patient_id, name')
      .eq('patient_id', patientId)
      .single();

    if (!patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { data: visits } = await supabase
      .from('visit')
      .select('visit_id')
      .eq('patient_id', patientData.id);

    if (!visits || visits.length === 0) {
      return res.status(200).json({
        success: true,
        labRequests: []
      });
    }

    const visitIds = visits.map(v => v.visit_id);

    const { data: labRequests, error: labRequestsError } = await supabase
      .from('lab_request')
      .select(`
        *,
        visit!inner(visit_id, visit_date),
        staff(name, specialization)
      `)
      .in('visit_id', visitIds)
      .order('request_id', { ascending: false });

    if (labRequestsError) {
      console.error('Patient lab requests fetch error:', labRequestsError);
      return res.status(500).json({ error: 'Failed to fetch lab requests' });
    }

    const labRequestIds = labRequests.map(req => req.request_id);
    let labResults = [];
    
    if (labRequestIds.length > 0) {
      const { data: resultsData } = await supabase
        .from('lab_result')
        .select('*')
        .eq('patient_id', patientData.id)
        .in('request_id', labRequestIds);
      
      labResults = resultsData || [];
    }

    const formattedRequests = labRequests.map(request => {
      const labResult = labResults.find(result => result.request_id === request.request_id);
      
      return {
        request_id: request.request_id,
        test_name: request.test_type,
        test_type: request.test_type,
        priority: 'normal',
        status: request.status,
        instructions: '',
        due_date: request.due_date,
        created_at: request.visit.visit_date,
        doctor: {
          name: request.staff.name,
          department: request.staff.specialization
        },
        labResult: labResult ? {
          result_id: labResult.result_id,
          file_name: labResult.file_path ? labResult.file_path.split('/').pop() : 'Uploaded File',
          file_url: labResult.file_path,
          upload_date: labResult.upload_date,
          results: labResult.results
        } : null
      };
    });

    res.status(200).json({
      success: true,
      labRequests: formattedRequests
    });

  } catch (error) {
    console.error('Get patient lab requests error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

app.post('/api/patient/upload-lab-result', authenticateToken, upload.single('labResultFile'), async (req, res) => {
  try {
    if (req.user.type !== 'outpatient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { labRequestId, patientId } = req.body;
    const file = req.file;

    if (!file || !labRequestId || !patientId) {
      return res.status(400).json({ error: 'File, lab request ID and patient ID are required' });
    }

    if (req.user.patientId !== patientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: patientData } = await supabase
      .from('outpatient')
      .select('id, patient_id')
      .eq('patient_id', patientId)
      .single();

    if (!patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { data: labRequestData } = await supabase
      .from('lab_request')
      .select('request_id, visit_id, status')
      .eq('request_id', labRequestId)
      .single();

    if (!labRequestData) {
      return res.status(404).json({ error: 'Lab request not found' });
    }

    const filePath = `/uploads/lab-results/${file.filename}`;

    // Get staff_id from the lab request
    const { data: requestInfo } = await supabase
      .from('lab_request')
      .select('staff_id')
      .eq('request_id', labRequestId)
      .single();

    const { data: labResultData, error: labResultError } = await supabase
      .from('lab_result')
      .insert({
        request_id: parseInt(labRequestId),
        patient_id: patientData.id,
        staff_id: requestInfo?.staff_id,
        file_path: filePath,
        upload_date: new Date().toISOString().split('T')[0],
        results: JSON.stringify({
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype
        })
      })
      .select()
      .single();

    if (labResultError) {
      console.error('Lab result save error:', labResultError);
      return res.status(500).json({ error: 'Failed to save lab result' });
    }

    await supabase
      .from('lab_request')
      .update({ status: 'completed' })
      .eq('request_id', labRequestId);

    const { data: existingMedicalRecord } = await supabase
      .from('medical_record')
      .select('record_id')
      .eq('patient_id', patientData.id)
      .eq('visit_id', labRequestData.visit_id)
      .single();

    if (existingMedicalRecord) {
      await supabase
        .from('medical_record')
        .update({ 
          result_id: labResultData.result_id,
          updated_at: new Date().toISOString()
        })
        .eq('record_id', existingMedicalRecord.record_id);
    } else {
      await supabase
        .from('medical_record')
        .insert({
          patient_id: patientData.id,
          visit_id: labRequestData.visit_id,
          result_id: labResultData.result_id
        });
    }

    res.status(201).json({
      success: true,
      labResult: {
        result_id: labResultData.result_id,
        file_name: file.originalname,
        file_url: filePath,
        upload_date: labResultData.upload_date
      },
      message: 'Lab result uploaded and medical record updated successfully'
    });

  } catch (error) {
    console.error('Upload lab result error:', error);
    res.status(500).json({ error: 'Internal server error during file upload' });
  }
});

// Get or create visit for patient today
app.post('/api/healthcare/patient-visit', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { patient_id } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const { data: patientData } = await supabase
      .from('outpatient')
      .select('id, patient_id, name')
      .eq('patient_id', patient_id)
      .single();

    if (!patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const today = new Date().toISOString().split('T')[0];

    let { data: existingVisit } = await supabase
      .from('visit')
      .select('visit_id')
      .eq('patient_id', patientData.id)
      .eq('visit_date', today)
      .single();

    if (existingVisit) {
      return res.status(200).json({
        success: true,
        visit_id: existingVisit.visit_id,
        message: 'Existing visit found'
      });
    }

    const { data: newVisit, error: visitError } = await supabase
      .from('visit')
      .insert({
        patient_id: patientData.id,
        visit_date: today,
        visit_time: new Date().toTimeString().split(' ')[0],
        appointment_type: 'Diagnosis Consultation',
        symptoms: 'Diagnosis consultation'
      })
      .select()
      .single();

    if (visitError) {
      console.error('Visit creation error:', visitError);
      return res.status(500).json({ error: 'Failed to create visit record' });
    }

    res.status(201).json({
      success: true,
      visit_id: newVisit.visit_id,
      message: 'New visit created'
    });

  } catch (error) {
    console.error('Patient visit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload lab result by test (Patient side)
app.post('/api/patient/upload-lab-result-by-test', authenticateToken, upload.single('labResultFile'), async (req, res) => {
  try {
    if (req.user.type !== 'outpatient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { labRequestId, patientId, testName } = req.body;
    const file = req.file;

    if (!file || !labRequestId || !patientId || !testName) {
      return res.status(400).json({ error: 'File, lab request ID, patient ID, and test name are required' });
    }

    if (req.user.patientId !== patientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: patientData } = await supabase
      .from('outpatient')
      .select('id, patient_id')
      .eq('patient_id', patientId)
      .single();

    if (!patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { data: labRequestData } = await supabase
      .from('lab_request')
      .select('request_id, visit_id, status, test_type')
      .eq('request_id', labRequestId)
      .single();

    if (!labRequestData) {
      return res.status(404).json({ error: 'Lab request not found' });
    }

    const filePath = `/uploads/lab-results/${file.filename}`;

    // Get staff_id from the lab request
    const { data: requestInfo } = await supabase
      .from('lab_request')
      .select('staff_id')
      .eq('request_id', labRequestId)
      .single();

    const { data: labResultData, error: labResultError } = await supabase
      .from('lab_result')
      .insert({
        request_id: parseInt(labRequestId),
        patient_id: patientData.id,
        staff_id: requestInfo?.staff_id || null,  // ✅ ADDED THIS LINE
        file_path: filePath,
        upload_date: new Date().toISOString().split('T')[0],
        results: JSON.stringify({
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          testName: testName
        })
      })
      .select()
      .single();

    if (labResultError) {
      console.error('Lab result save error:', labResultError);
      return res.status(500).json({ error: 'Failed to save lab result' });
    }

    const testTypes = labRequestData.test_type.split(', ');
    const { data: uploadedResults } = await supabase
      .from('lab_result')
      .select('results')
      .eq('request_id', labRequestId);

    const uploadedTestNames = uploadedResults?.map(result => {
      try {
        return JSON.parse(result.results).testName;
      } catch {
        return null;
      }
    }).filter(Boolean) || [];

    if (uploadedTestNames.length >= testTypes.length) {
      await supabase
        .from('lab_request')
        .update({ status: 'completed' })
        .eq('request_id', labRequestId);
    }

    const { data: existingMedicalRecord } = await supabase
      .from('medical_record')
      .select('record_id')
      .eq('patient_id', patientData.id)
      .eq('visit_id', labRequestData.visit_id)
      .single();

    if (existingMedicalRecord) {
      await supabase
        .from('medical_record')
        .update({ 
          result_id: labResultData.result_id,
          updated_at: new Date().toISOString()
        })
        .eq('record_id', existingMedicalRecord.record_id);
    } else {
      await supabase
        .from('medical_record')
        .insert({
          patient_id: patientData.id,
          visit_id: labRequestData.visit_id,
          result_id: labResultData.result_id
        });
    }

    res.status(201).json({
      success: true,
      labResult: {
        result_id: labResultData.result_id,
        file_name: file.originalname,
        file_url: filePath,
        upload_date: labResultData.upload_date,
        testName: testName
      },
      message: `Lab result for ${testName} uploaded successfully`
    });

  } catch (error) {
    console.error('Upload lab result by test error:', error);
    res.status(500).json({ error: 'Internal server error during file upload' });
  }
});

// Get patient lab history
app.get('/api/patient/lab-history/:patientId', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'outpatient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { patientId } = req.params;
    
    if (req.user.patientId !== patientId) {
      return res.status(403).json({ error: 'Access denied to other patient data' });
    }

    const { data: patientData } = await supabase
      .from('outpatient')  // ✅ lowercase
      .select('id, patient_id, name')
      .eq('patient_id', patientId)
      .single();

    if (!patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // ✅ FIX: Correct query with proper table names
    const { data: labHistory, error: labHistoryError } = await supabase
      .from('lab_request')  // ✅ snake_case
      .select(`
        request_id,
        test_type,
        created_at,
        status,
        visit!inner(
          visit_date,
          outpatient!inner(patient_id)
        ),
        staff(
          name,
          specialization,
          department_id,
          department(
            name
          )
        ),
        lab_result(count)
      `)
      .eq('visit.outpatient.patient_id', patientId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (labHistoryError) {
      console.error('Lab history fetch error:', labHistoryError);
      return res.status(500).json({ error: 'Failed to fetch lab history' });
    }

    const requestIds = (labHistory || []).map(req => req.request_id);
    let uploadDates = {};
    
    if (requestIds.length > 0) {
      const { data: uploadData } = await supabase
        .from('lab_result')
        .select('request_id, upload_date')
        .in('request_id', requestIds)
        .order('upload_date', { ascending: true });

      (uploadData || []).forEach(item => {
        if (!uploadDates[item.request_id]) {
          uploadDates[item.request_id] = item.upload_date;
        }
      });
    }

    // ✅ FIX: Add null checks
    const formattedHistory = (labHistory || []).map(request => ({
      request_id: request.request_id,
      test_name: request.test_type,
      test_type: request.test_type,
      request_date: request.created_at,
      completion_date: uploadDates[request.request_id] || null,
      status: 'completed',
      file_count: request.lab_result?.[0]?.count || 0,  // ✅ Added optional chaining
      doctor: {
        name: request.staff?.name || 'Unknown',  // ✅ Added fallback
        specialization: request.staff?.specialization || 'Unknown',
        department: request.staff?.department?.name || 'Unknown'
      }
    }));

    res.status(200).json({
      success: true,
      labHistory: formattedHistory
    });

  } catch (error) {
    console.error('Get patient lab history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Get lab history files for a specific request
app.get('/api/patient/lab-history-files/:requestId', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'outpatient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { requestId } = req.params;

    const { data: patientData } = await supabase
      .from('outpatient')
      .select('id, patient_id')
      .eq('patient_id', req.user.patientId)
      .single();

    if (!patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { data: labFiles, error: labFilesError } = await supabase
      .from('lab_result')
      .select(`
        result_id,
        file_path,
        upload_date,
        results,
        lab_request!inner(
          request_id,
          test_type
        )
      `)
      .eq('request_id', requestId)
      .eq('patient_id', patientData.id)
      .order('upload_date', { ascending: true });

    if (labFilesError) {
      console.error('Lab files fetch error:', labFilesError);
      return res.status(500).json({ error: 'Failed to fetch lab files' });
    }

    const formattedFiles = (labFiles || []).map(file => {
      let testName = file.lab_request.test_type;
      let fileName = 'Uploaded File';
      
      try {
        const parsedResults = JSON.parse(file.results);
        testName = parsedResults.testName || testName;
        fileName = parsedResults.originalName || fileName;
      } catch (e) {
        fileName = file.file_path ? file.file_path.split('/').pop() : fileName;
      }

      return {
        result_id: file.result_id,
        test_name: testName,
        file_name: fileName,
        file_path: file.file_path ? `http://localhost:5000${file.file_path}` : null,
        upload_date: file.upload_date
      };
    });

    res.status(200).json({
      success: true,
      files: formattedFiles
    });

  } catch (error) {
    console.error('Get lab history files error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get detailed lab statistics
app.get('/api/healthcare/lab-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: labRequestStats } = await supabase
      .from('lab_request')
      .select('status')
      .eq('staff_id', req.user.id);

    const { count: totalFiles } = await supabase
      .from('lab_result')
      .select(`
        lab_request!inner(staff_id)
      `, { count: 'exact' })
      .eq('labRequest.staff_id', req.user.id);

    const stats = {
      totalRequests: labRequestStats?.length || 0,
      pendingRequests: labRequestStats?.filter(r => r.status === 'pending').length || 0,
      completedRequests: labRequestStats?.filter(r => r.status === 'completed').length || 0,
      totalFilesUploaded: totalFiles || 0
    };

    res.status(200).json({
      success: true,
      labStats: stats
    });

  } catch (error) {
    console.error('Lab stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/healthcare/my-patients-queue', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { date } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const filterDate = date || today;

    const { data: staffData } = await supabase
      .from('staff')
      .select('department_id, specialization')
      .eq('id', req.user.id)
      .single();

    if (!staffData) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    let allTodayPatients = [];

    // Get completed diagnoses by this doctor
    const { data: completedPatients, error: completedError } = await supabase
      .from('diagnosis')
      .select(`
        created_at,
        visit!inner(
          visit_id,
          visit_date,
          visit_time,
          symptoms,
          appointment_type,
          outpatient!inner(
            id,
            patient_id,
            name,
            age,
            sex,
            contact_no,
            email
          ),
          queue!inner(
            queue_id,
            queue_no,
            status,
            department_id
          )
        )
      `)
      .eq('staff_id', req.user.id)
      .eq('visit.visit_date', filterDate)
      .eq('visit.queue.department_id', staffData.department_id)
      .order('created_at', { ascending: false });

    if (completedPatients && !completedError) {
      completedPatients.forEach(item => {
        allTodayPatients.push({
          patient_id: item.visit.outpatient.patient_id,
          name: item.visit.outpatient.name,
          age: item.visit.outpatient.age,
          sex: item.visit.outpatient.sex,
          contact_no: item.visit.outpatient.contact_no,
          email: item.visit.outpatient.email,
          lastVisit: item.visit.visit_date,
          lastSymptoms: item.visit.symptoms,
          queueStatus: 'completed',
          queueNumber: item.visit.queue?.[0]?.queue_no,
          visitTime: item.visit.visit_time,
          isInQueue: false,
          completedAt: item.created_at,
          visit_id: item.visit.visit_id,
          queue_id: item.visit.queue?.[0]?.queue_id,
          diagnosedByMe: true
        });
      });
    }

    // Get patients in queue (waiting and in_progress)
    const { data: queuePatients, error: queueError } = await supabase
      .from('queue')
      .select(`
        queue_id,
        queue_no,
        status,
        created_time,
        visit!inner(
          visit_id,
          visit_date,
          visit_time,
          symptoms,
          appointment_type,
          outpatient!inner(
            id,
            patient_id,
            name,
            age,
            sex,
            contact_no,
            email
          )
        )
      `)
      .eq('department_id', staffData.department_id)
      .in('status', ['waiting', 'in_progress'])
      .eq('visit.visit_date', filterDate)
      .order('queue_no', { ascending: true });

    if (queuePatients && !queueError) {
      queuePatients.forEach(item => {
        const existingPatient = allTodayPatients.find(p => p.patient_id === item.visit.outpatient.patient_id);
        if (!existingPatient) {
          allTodayPatients.push({
            patient_id: item.visit.outpatient.patient_id,
            name: item.visit.outpatient.name,
            age: item.visit.outpatient.age,
            sex: item.visit.outpatient.sex,
            contact_no: item.visit.outpatient.contact_no,
            email: item.visit.outpatient.email,
            lastVisit: item.visit.visit_date,
            lastSymptoms: item.visit.symptoms,
            queueStatus: item.status,
            queueNumber: item.queue_no,
            visitTime: item.visit.visit_time,
            isInQueue: true,
            visit_id: item.visit.visit_id,
            queue_id: item.queue_id,
            diagnosedByMe: false
          });
        }
      });
    }

    // Sort: Active patients first (by queue number), then completed patients (by completion time)
    allTodayPatients.sort((a, b) => {
      if (a.isInQueue && !b.isInQueue) return -1;
      if (!a.isInQueue && b.isInQueue) return 1;
      
      if (a.isInQueue && b.isInQueue) {
        return (a.queueNumber || 0) - (b.queueNumber || 0);
      }
      
      return new Date(b.completedAt) - new Date(a.completedAt);
    });

    res.status(200).json({
      success: true,
      patients: allTodayPatients,
      summary: {
        total: allTodayPatients.length,
        inQueue: allTodayPatients.filter(p => p.isInQueue).length,
        completed: allTodayPatients.filter(p => !p.isInQueue).length,
        myDiagnoses: allTodayPatients.filter(p => p.diagnosedByMe).length
      },
      department: {
        id: staffData.department_id,
        specialization: staffData.specialization
      }
    });

  } catch (error) {
    console.error('My patients queue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/healthcare/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { date } = req.query;
    const today = date || new Date().toISOString().split('T')[0];
    
    const { data: staffData } = await supabase
      .from('staff')
      .select('department_id, specialization')
      .eq('id', req.user.id)
      .single();

    if (!staffData) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const { count: myPatientsToday } = await supabase
      .from('diagnosis')
      .select(`
        visit!inner(
          visit_date,
          queue!inner(department_id)
        )
      `, { count: 'exact' })
      .eq('staff_id', req.user.id)
      .eq('visit.visit_date', today)
      .eq('visit.queue.department_id', staffData.department_id);

    const { count: queueCount } = await supabase
      .from('queue')
      .select(`
        visit!inner(visit_date)
      `, { count: 'exact' })
      .eq('department_id', staffData.department_id)
      .in('status', ['waiting', 'in_progress'])
      .eq('visit.visit_date', today);

    const { count: totalLabRequests } = await supabase
      .from('lab_request')
      .select('*', { count: 'exact' })
      .eq('staff_id', req.user.id)
      .eq('status', 'completed');

    const totalTodayPatients = (myPatientsToday || 0) + (queueCount || 0);

    res.status(200).json({
      success: true,
      stats: {
        myPatientsToday: totalTodayPatients,
        totalLabResults: totalLabRequests || 0,
        breakdown: {
          consulted: myPatientsToday || 0,
          inQueue: queueCount || 0,
          total: totalTodayPatients
        }
      },
      department: {
        id: staffData.department_id,
        specialization: staffData.specialization
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create grouped lab request
app.post('/api/healthcare/lab-requests-grouped', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { patient_id, test_requests, priority, instructions, due_date, group_name } = req.body;

    if (!patient_id || !test_requests || test_requests.length === 0) {
      return res.status(400).json({ error: 'Patient ID and test requests are required' });
    }

    const { data: patientData } = await supabase
      .from('outpatient')
      .select('id, patient_id, name')
      .eq('patient_id', patient_id)
      .single();

    if (!patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    let { data: visitData } = await supabase
      .from('visit')
      .select('visit_id')
      .eq('patient_id', patientData.id)
      .eq('visit_date', today)
      .single();

    if (!visitData) {
      const { data: newVisit, error: visitError } = await supabase
        .from('visit')
        .insert({
          patient_id: patientData.id,
          visit_date: today,
          visit_time: new Date().toTimeString().split(' ')[0],
          appointment_type: 'Lab Request',
          symptoms: 'Multiple lab tests requested'
        })
        .select()
        .single();

      if (visitError) {
        return res.status(500).json({ error: 'Failed to create visit record' });
      }
      visitData = newVisit;
    }

    const groupedTestName = test_requests.map(t => t.test_name).join(', ');
    const groupedTestType = test_requests.map(t => t.test_type).join(', ');

    const { data: labRequestData, error: labRequestError } = await supabase
      .from('lab_request')
      .insert({
        visit_id: visitData.visit_id,
        staff_id: req.user.id,
        test_type: groupedTestType,
        due_date: due_date,
        status: 'pending'
      })
      .select()
      .single();

    if (labRequestError) {
      console.error('Grouped lab request creation error:', labRequestError);
      return res.status(500).json({ error: 'Failed to create lab request' });
    }

    res.status(201).json({
      success: true,
      labRequest: labRequestData,
      testsCount: test_requests.length,
      message: 'Grouped lab request created successfully'
    });

  } catch (error) {
    console.error('Create grouped lab request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/healthcare/lab-requests', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { patient_id, test_name, test_type, priority, instructions, due_date } = req.body;

    if (!patient_id || !test_name || !test_type) {
      return res.status(400).json({ error: 'Patient ID, test name, and test type are required' });
    }

    const { data: patientData } = await supabase
      .from('outpatient')
      .select('id, patient_id, name')
      .eq('patient_id', patient_id)
      .single();

    if (!patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    let { data: visitData } = await supabase
      .from('visit')
      .select('visit_id')
      .eq('patient_id', patientData.id)
      .eq('visit_date', today)
      .single();

    if (!visitData) {
      const { data: newVisit, error: visitError } = await supabase
        .from('visit')
        .insert({
          patient_id: patientData.id,
          visit_date: today,
          visit_time: new Date().toTimeString().split(' ')[0],
          appointment_type: 'Lab Request',
          symptoms: 'Lab test requested'
        })
        .select()
        .single();

      if (visitError) {
        return res.status(500).json({ error: 'Failed to create visit record' });
      }
      visitData = newVisit;
    }

    const { data: labRequestData, error: labRequestError } = await supabase
      .from('lab_request')
      .insert({
        visit_id: visitData.visit_id,
        staff_id: req.user.id,
        test_type: test_type,
        due_date: due_date,
        status: 'pending'
      })
      .select()
      .single();

    if (labRequestError) {
      console.error('Lab request creation error:', labRequestError);
      return res.status(500).json({ error: 'Failed to create lab request' });
    }

    res.status(201).json({
      success: true,
      labRequest: labRequestData,
      message: 'Lab request created successfully'
    });

  } catch (error) {
    console.error('Create lab request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: error.message 
  });
});

// Diagnosis and medical records
app.post('/api/healthcare/diagnosis', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { 
      visit_id, 
      patient_id, 
      diagnosis_code, 
      diagnosis_description, 
      diagnosis_type, 
      severity, 
      notes,
      result_id 
    } = req.body;

    if (!visit_id || !patient_id || !diagnosis_description) {
      return res.status(400).json({ error: 'Visit ID, patient ID, and diagnosis description are required' });
    }

    const { data: patientData } = await supabase
      .from('outpatient')
      .select('id')
      .eq('patient_id', patient_id)
      .single();

    if (!patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { data: diagnosisData, error: diagnosisError } = await supabase
      .from('diagnosis')
      .insert({
        visit_id: parseInt(visit_id),
        patient_id: patientData.id,
        staff_id: req.user.id,
        diagnosis_code,
        diagnosis_description,
        diagnosis_type: diagnosis_type || 'primary',
        severity: severity || 'moderate',
        notes
      })
      .select()
      .single();

    if (diagnosisError) {
      console.error('Diagnosis creation error:', diagnosisError);
      return res.status(500).json({ error: 'Failed to create diagnosis' });
    }

    const { data: medicalRecordData, error: medicalRecordError } = await supabase
      .from('medical_record')
      .insert({
        patient_id: patientData.id,
        visit_id: parseInt(visit_id),
        result_id: result_id ? parseInt(result_id) : null
      })
      .select()
      .single();

    if (medicalRecordError) {
      console.error('Medical record creation error:', medicalRecordError);
    }

    res.status(201).json({
      success: true,
      diagnosis: diagnosisData,
      medicalRecord: medicalRecordData,
      message: 'Diagnosis and medical record created successfully'
    });

  } catch (error) {
    console.error('Create diagnosis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/healthcare/medical-records/:patientId', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { patientId } = req.params;

    const { data: patientData } = await supabase
      .from('outpatient')
      .select('id, patient_id, name')
      .eq('patient_id', patientId)
.single();

    if (!patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { data: medicalRecords, error: medicalRecordsError } = await supabase
      .from('medical_record')
      .select(`
        *,
        visit!inner(
          visit_id,
          visit_date,
          visit_time,
          appointment_type,
          symptoms
        ),
        lab_result(
          result_id,
          file_path,
          upload_date,
          results,
          interpretation
        )
      `)
      .eq('patient_id', patientData.id)
      .order('created_at', { ascending: false });

    if (medicalRecordsError) {
      console.error('Medical records fetch error:', medicalRecordsError);
      return res.status(500).json({ error: 'Failed to fetch medical records' });
    }

    res.status(200).json({
      success: true,
      patient: {
        id: patientData.id,
        patient_id: patientData.patient_id,
        name: patientData.name
      },
      medicalRecords: medicalRecords || []
    });

  } catch (error) {
    console.error('Get medical records error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Queue Display API - Get current queue status for TV monitor
app.get('/api/queue/display/:departmentId', async (req, res) => {
  try {
    const { departmentId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    // Get department name
    const { data: department, error: deptError } = await supabase
      .from('department')
      .select('name')
      .eq('department_id', departmentId)
      .single();

    if (deptError) {
      return res.status(404).json({ 
        success: false, 
        error: 'Department not found' 
      });
    }

    // Get current patient being served (status = 'in_progress')
    const { data: currentPatient } = await supabase
      .from('queue')
      .select(`
        queue_no,
        visit!inner(
          visit_date
        )
      `)
      .eq('department_id', departmentId)
      .eq('status', 'in_progress')
      .eq('visit.visit_date', today)
      .maybeSingle();

    // Get waiting patients (status = 'waiting')
    const { data: waitingPatients } = await supabase
      .from('queue')
      .select(`
        queue_id,
        queue_no,
        created_time,
        visit!inner(
          visit_date
        )
      `)
      .eq('department_id', departmentId)
      .eq('status', 'waiting')
      .eq('visit.visit_date', today)
      .order('queue_no', { ascending: true });

    // Calculate wait times
    const now = new Date();
    const formattedWaiting = (waitingPatients || []).map(patient => ({
      queue_id: patient.queue_id,
      queue_no: patient.queue_no,
      wait_minutes: Math.floor((now - new Date(patient.created_time)) / 60000)
    }));

    res.json({
      success: true,
      departmentName: department.name,
      current: currentPatient ? {
        queue_no: currentPatient.queue_no
      } : null,
      waiting: formattedWaiting
    });

  } catch (error) {
    console.error('Queue display API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Email OTP: ${emailConfig.auth.user ? 'Configured' : 'Not configured'}`);
  console.log(`SMS OTP: ${isSMSConfigured ? 'iTexMo configured' : 'Not configured'}`);
  console.log(`Database: ${SUPABASE_URL ? 'Connected' : 'Not connected'}`);
});

module.exports = app;
