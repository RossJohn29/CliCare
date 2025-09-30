// server.js
    const express = require('express');
    const cors = require('cors');
    const helmet = require('helmet');
    const rateLimit = require('express-rate-limit');
    const jwt = require('jsonwebtoken');
    const bcrypt = require('bcryptjs');
    const { createClient } = require('@supabase/supabase-js');
    const nodemailer = require('nodemailer');
    const axios = require('axios');
    const QRCode = require('qrcode');
    const multer = require('multer');
    const fs = require('fs');
    const path = require('path');
    require('dotenv').config();


    const app = express();
    const PORT = process.env.PORT || 5000;


    // Environment Configuration
    const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';


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
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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
    console.log('✅ Upload directory created:', uploadDir);
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
      max: 50,
      message: {
        error: 'Too many requests from this network. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });


    // Update your general limiter
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // Increased from 100
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


    // Routes


    // Healthcare Provider Login
    app.post('/api/healthcare/login', generalLoginLimiter, async (req, res) => {
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
          .from('healthStaff')
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
          .from('healthAdmin')
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
          .from('outPatient')
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
          .from('otpVerification')
          .delete()
          .eq('patient_id', patientId.toUpperCase())
          .eq('contact_info', contactInfo);


        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);


        const { data: otpRecord, error: otpError } = await supabase
          .from('otpVerification')
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
            .from('otpVerification')
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
    app.post('/api/outpatient/verify-otp', generalLoginLimiter, async (req, res) => {
      try {
        const { patientId, contactInfo, otp, deviceType } = req.body;


        if (!patientId || !contactInfo || !otp) {
          return res.status(400).json({
            error: 'Patient ID, contact info, and OTP are required'
          });
        }


        const { data: otpData, error: otpError } = await supabase
          .from('otpVerification')
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
            .from('otpVerification')
            .update({ attempts: otpData.attempts + 1 })
            .eq('id', otpData.id);


          return res.status(400).json({
            error: 'Invalid verification code'
          });
        }


        await supabase
          .from('otpVerification')
          .update({ is_verified: true })
          .eq('id', otpData.id);


        // Get patient data
        const { data: patientData, error: patientError } = await supabase
          .from('outPatient')
          .select('*')
          .eq('patient_id', patientId.toUpperCase())
          .single();


        if (patientError || !patientData) {
          return res.status(404).json({
            error: 'Patient data not found'
          });
        }


        // Get emergency contact data using the patient's internal ID
        const { data: emergencyContactData, error: emergencyError } = await supabase
          .from('emergencyContact')
          .select('*')
          .eq('patient_id', patientData.id) // Use the internal ID
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


        // Include emergency contact data in the response
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
            // Add emergency contact fields
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


    // Add department assignment logic function
    const assignDepartmentBySymptoms = (symptoms) => {
    const departmentMapping = {
      // Emergency/High Priority - Cardiology (department_id: 3)
      'Chest Pain': 3,
      'Chest Discomfort': 3, 
      'Heart Palpitations': 3,
      'High Blood Pressure': 3,
      'Shortness of Breath': 3,
      'Irregular Heartbeat': 3,
      'Seizures': 1, // Emergency
      'Wounds': 1, // Emergency
      
      // Neurological - Internal Medicine (department_id: 2)
      'Migraine': 2,
      'Memory Problems': 2,
      'Numbness': 2,
      'Tingling': 2,
      'Balance Issues': 2,
      
      // Gastrointestinal - Internal Medicine
      'Stomach Ache': 2,
      'Diarrhea': 2,
      'Constipation': 2,
      'Heartburn': 2,
      'Bloating': 2,
      
      // General/Internal Medicine (department_id: 2)
      'Fever': 2,
      'Headache': 2,
      'Fatigue': 2,
      'Body Aches': 2,
      'Dizziness': 2,
      'Nausea': 2,
      'Vomiting': 2,
      'Loss of Appetite': 2,
      'Cough': 2,
      'Sore Throat': 2,
      'Runny Nose': 2,
      'Sneezing': 2,
      'Back Pain': 2,
      'Joint Pain': 2,
      'Muscle Cramps': 2,
      'Neck Pain': 2,
      'Rash': 2,
      'Itching': 2,
      'Skin Discoloration': 2,
      'Acne': 2,
      'Hair Loss': 2,
      'Anxiety': 2,
      'Depression': 2,
      'Stress': 2,
      'Sleep Problems': 2,
      'Mood Changes': 2,
      'Vision Problems': 2,
      'Hearing Loss': 2,
      'Ear Pain': 2,
      'Eye Pain': 2,
      'Discharge': 2,
      
      // Women's Health - Internal Medicine
      'Menstrual Problems': 2,
      'Pregnancy Concerns': 2,
      'Menopause Symptoms': 2,
      'Breast Issues': 2,
      
      // Routine Care - Internal Medicine
      'Annual Check-up': 2,
      'Health Screening': 2,
      'Vaccination': 2,
      'Follow-up Visit': 2,
      'Lab Test Follow-up': 2,
      'Prescription Refill': 2
    };
    
    // Find the most critical symptom first
    for (const symptom of symptoms) {
      if (departmentMapping[symptom]) {
        return departmentMapping[symptom];
      }
    }
    
    return 2; // Default to Internal Medicine
  };

    // Get symptoms endpoint
  app.get('/api/symptoms', async (req, res) => {
    try {
      console.log('📋 Fetching symptoms from database...');
      
      // Fetch all active symptoms from the database
      const { data: symptomsData, error: symptomsError } = await supabase
        .from('symptoms')
        .select('name, category, department_id, age_group, priority, estimated_wait')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (symptomsError) {
        console.error('❌ Database error fetching symptoms:', symptomsError);
        return res.status(500).json({
          error: 'Failed to fetch symptoms from database',
          details: symptomsError.message
        });
      }

      if (!symptomsData || symptomsData.length === 0) {
        console.log('⚠️ No symptoms found in database');
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
          estimated_wait: symptom.estimated_wait,
          age_group: symptom.age_group
        });
        return acc;
      }, {});

      // Convert to array format expected by frontend
      const formattedSymptoms = Object.entries(groupedSymptoms)
        .map(([category, symptoms]) => ({
          category,
          symptoms: symptoms.map(s => s.name), // Frontend expects just the name strings
          count: symptoms.length,
          metadata: symptoms // Keep full data for potential future use
        }))
        .sort((a, b) => {
          // Sort categories: General first, then Routine Care last, others alphabetically
          if (a.category === 'General Symptoms') return -1;
          if (b.category === 'General Symptoms') return 1;
          if (a.category === 'Routine Care') return 1;
          if (b.category === 'Routine Care') return -1;
          return a.category.localeCompare(b.category);
        });

      console.log('✅ Symptoms fetched successfully:', formattedSymptoms.length, 'categories');
      console.log('Categories:', formattedSymptoms.map(cat => `${cat.category} (${cat.count})`));

      res.status(200).json({
        success: true,
        symptoms: formattedSymptoms,
        totalCategories: formattedSymptoms.length,
        totalSymptoms: symptomsData.length,
        message: 'Symptoms loaded successfully'
      });

    } catch (error) {
      console.error('💥 Error in symptoms endpoint:', error);
      res.status(500).json({
        error: 'Internal server error while fetching symptoms',
        details: error.message
      });
    }
  });


    // Patient registration endpoint
    app.post('/api/patient/register', async (req, res) => {
      try {
        console.log('📝 Registration request received:', req.body);
        
        const {
          name,
          birthday,
          age,
          sex,
          address,
          contact_no,
          email,
          emergency_contact_name,
          emergency_contact_relationship,
          emergency_contact_no,
          symptoms
        } = req.body;

        // Validate required fields
        if (!name || !birthday || !age || !sex || !address || !contact_no || !email) {
          console.log('❌ Missing required fields');
          return res.status(400).json({ 
            error: 'Missing required fields' 
          });
        }

        // Generate unique patient ID
        const patientId = `PAT${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        console.log('🆔 Generated Patient ID:', patientId);

        // Insert into outPatient table
        const { data: patientData, error: patientError } = await supabase
          .from('outPatient')
          .insert({
            patient_id: patientId,
            name,
            birthday,
            age: parseInt(age),
            sex,
            address,
            contact_no,
            email: email.toLowerCase(),
            registration_date: new Date().toISOString().split('T')[0]
          })
          .select()
          .single();

        if (patientError) {
          console.error('💥 Patient registration error:', patientError);
          return res.status(500).json({ 
            error: 'Patient registration failed',
            details: patientError.message 
          });
        }

        // Insert emergency contact if provided
        if (emergency_contact_name || emergency_contact_relationship || emergency_contact_no) {
          await supabase
            .from('emergencyContact')
            .insert({
              patient_id: patientData.id,
              name: emergency_contact_name,
              contact_number: emergency_contact_no,
              relationship: emergency_contact_relationship
            });
        }

        // Create visit record with symptoms and department assignment ONLY if symptoms provided
        if (symptoms && symptoms.length > 0) {
          const symptomsArray = Array.isArray(symptoms) ? symptoms : [symptoms];
          let assignedDepartmentId = assignDepartmentBySymptoms(symptomsArray);
          
          // Override with Pediatrics if patient is under 18
          if (parseInt(age) < 18) {
            assignedDepartmentId = 4; // Pediatrics
          }

          // Get available doctor from the assigned department
          const { data: availableDoctor } = await supabase
            .from('healthStaff')
            .select('id, name, staff_id')
            .eq('department_id', assignedDepartmentId)
            .eq('role', 'Doctor')
            .order('id', { ascending: true })
            .limit(1)
            .single();

          const { data: visitData, error: visitError } = await supabase
            .from('visit')
            .insert({
              patient_id: patientData.id,
              visit_date: new Date().toISOString().split('T')[0],
              visit_time: new Date().toTimeString().split(' ')[0],
              appointment_type: 'Walk-in Registration',
              symptoms: symptomsArray.join(', ')
            })
            .select()
            .single();

          if (!visitError) {
            // Generate queue number for the department
            const { data: existingQueue } = await supabase
              .from('queue')
              .select('queue_no')
              .eq('department_id', assignedDepartmentId)
              .order('queue_no', { ascending: false })
              .limit(1);

            const nextQueueNo = existingQueue.length > 0 ? existingQueue[0].queue_no + 1 : 1;

            // Create queue entry
            await supabase
              .from('queue')
              .insert({
                visit_id: visitData.visit_id,
                department_id: assignedDepartmentId,
                queue_no: nextQueueNo,
                status: 'waiting'
              });

            // Get department name
            const { data: departmentData } = await supabase
              .from('department')
              .select('name')
              .eq('department_id', assignedDepartmentId)
              .single();

            console.log(`✅ Patient assigned to ${departmentData?.name || 'Unknown Department'}, Queue #${nextQueueNo}`);
            if (availableDoctor) {
              console.log(`📌 Assigned Doctor: ${availableDoctor.name} (${availableDoctor.staff_id})`);
            }
          }
        }

        console.log('✅ New patient registered:', patientData.name, 'ID:', patientData.patient_id);

        res.status(201).json({
          success: true,
          patient: patientData,
          message: 'Patient registered successfully'
        });

      } catch (error) {
        console.error('💥 Registration error:', error);
        res.status(500).json({ 
          error: 'Internal server error',
          details: error.message 
        });
      }
    });

    // Get all patients consulted by the current doctor's department
    app.get('/api/healthcare/all-patients', authenticateToken, async (req, res) => {
      try {
        if (req.user.type !== 'healthcare') {
          return res.status(403).json({ error: 'Access denied' });
        }


        // Get doctor's department
        const { data: staffData } = await supabase
          .from('healthStaff')
          .select('department_id, specialization')
          .eq('id', req.user.id)
          .single();


        if (!staffData) {
          return res.status(404).json({ error: 'Staff not found' });
        }


        // Get all unique patients who have visited this doctor's department
        const { data: patientsData, error: patientsError } = await supabase
          .from('queue')
          .select(`
            visit!inner(
              patient_id,
              outPatient!inner(
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


        // Remove duplicates based on patient_id
        const uniquePatients = [];
        const seenPatientIds = new Set();


        patientsData.forEach(item => {
          const patient = item.visit.outPatient;
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

    // Get Patient Visit History - UPDATED to include doctor info and proper department
    app.get('/api/patient/history/:patientId', authenticateToken, async (req, res) => {
      try {
        if (req.user.type !== 'outpatient') {
          return res.status(403).json({ error: 'Access denied' });
        }

        const { patientId } = req.params;
        
        // Get patient internal ID
        const { data: patientData } = await supabase
          .from('outPatient')
          .select('id')
          .eq('patient_id', patientId)
          .single();

        if (!patientData) {
          return res.status(404).json({ error: 'Patient not found' });
        }

        // Get visit history with doctor and department information - FIXED
        const { data: visitHistory, error: visitError } = await supabase
          .from('visit')
          .select(`
            visit_id,
            visit_date,
            visit_time,
            appointment_type,
            symptoms,
            duration,
            severity,
            previous_treatment,
            allergies,
            medications,
            diagnosis(
              diagnosis_id,
              diagnosis_description,
              diagnosis_code,
              diagnosis_type,
              severity,
              notes,
              created_at,
              healthStaff(
                name,
                specialization,
                role,
                license_no,
                department_id,
                department(
                  name
                )
              )
            ),
            queue(
              queue_no,
              status,
              department(
                name
              )
            ),
            labRequest(
              request_id,
              test_type,
              status,
              created_at,
              healthStaff!staff_id!inner(
                name,
                specialization,
                department_id,
                department!inner(
                  name
                )
              )
            )
          `)
          .eq('patient_id', patientData.id)
          .order('visit_date', { ascending: false })
          .order('visit_time', { ascending: false });

        if (visitError) {
          console.error('Patient history error:', visitError);
          return res.status(500).json({ error: 'Failed to fetch visit history' });
        }

        res.status(200).json({
          success: true,
          visitHistory: visitHistory || []
        });

      } catch (error) {
        console.error('Patient history error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });


    // Modify the existing fetchMyPatients to only show completed consultations by this doctor
    app.get('/api/healthcare/my-patients', authenticateToken, async (req, res) => {
      try {
        if (req.user.type !== 'healthcare') {
          return res.status(403).json({ error: 'Access denied' });
        }

        const { date } = req.query;
        const today = new Date().toISOString().split('T')[0];
        const filterDate = date || today;

        // Get doctor's department
        const { data: staffData } = await supabase
          .from('healthStaff')
          .select('department_id, specialization')
          .eq('id', req.user.id)
          .single();

        if (!staffData) {
          return res.status(404).json({ error: 'Staff not found' });
        }

        // Get patients who have COMPLETED consultation with THIS SPECIFIC DOCTOR
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
              outPatient!inner(
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
          .eq('staff_id', req.user.id) // FIXED: Only this doctor's diagnoses
          .eq('visit.visit_date', filterDate) // Filter by specific date
          .eq('visit.queue.department_id', staffData.department_id) // Ensure correct department
          .eq('visit.queue.status', 'completed') // Only completed consultations
          .order('created_at', { ascending: false });

        if (patientsError) {
          console.error('Patients fetch error:', patientsError);
          return res.status(500).json({ error: 'Failed to fetch patients' });
        }

        // Remove duplicates and format data
        const uniquePatients = [];
        const seenPatientIds = new Set();

        (patientsData || []).forEach(item => {
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
              queueStatus: 'completed',
              visitTime: item.visit.visit_time,
              isInQueue: false
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


  // Get patient history for healthcare dashboard (with doctor and department info)
  app.get('/api/healthcare/patient-history/:patientId', authenticateToken, async (req, res) => {
    try {
      if (req.user.type !== 'healthcare') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { patientId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      // Get patient basic info
      const { data: patientData, error: patientError } = await supabase
        .from('outPatient')
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
          emergencyContact(
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

      // Get visit history with doctor and department information
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
            created_at,
            healthStaff(
              name,
              specialization,
              role,
              license_no
            )
          ),
          queue(
            queue_no,
            status,
            department(
              name
            )
          ),
          labRequest(
            request_id,
            test_type,
            status,
            healthStaff(
              name,
              specialization
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

      // Get total count for pagination
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

  app.get('/api/healthcare/patient-queue', authenticateToken, async (req, res) => {
    try {
      if (req.user.type !== 'healthcare') {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get doctor's department
      const { data: staffData } = await supabase
        .from('healthStaff')
        .select('department_id, specialization')
        .eq('id', req.user.id)
        .single();

      if (!staffData) {
        return res.status(404).json({ error: 'Staff not found' });
      }

      const today = new Date().toISOString().split('T')[0];

      // Get ALL patients in queue for this department today (including completed)
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
            outPatient!inner(
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

      // Mark which completed patients were diagnosed by this doctor
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

    // Update the existing queue status endpoint
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

      // Get queue data with visit and patient info
      const { data: queueData, error: queueFetchError } = await supabase
        .from('queue')
        .select(`
          *,
          visit!inner(
            visit_id,
            patient_id,
            outPatient!inner(id, patient_id)
          )
        `)
        .eq('queue_id', queueId)
        .single();

      if (queueFetchError || !queueData) {
        return res.status(404).json({ error: 'Queue entry not found' });
      }

      // Update queue status
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

      // Only create diagnosis if specifically marking as completed AND diagnosis provided
      if (status === 'completed' && diagnosis_description) {
        // Create diagnosis WITH THIS DOCTOR'S ID
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

          // Create medical record
          const { data: newMedicalRecord, error: medicalRecordError } = await supabase
            .from('medicalRecord')
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


    // Visit/Appointment booking endpoint
    app.post('/api/patient/visit', async (req, res) => {
      try {
        console.log('📅 Visit booking request:', req.body);
        
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

        // Find patient first
        const { data: patientData, error: patientError } = await supabase
          .from('outPatient')
          .select('id, patient_id, name, age')
          .eq('patient_id', patient_id)
          .single();

        if (patientError || !patientData) {
          console.log('❌ Patient not found:', patient_id);
          return res.status(404).json({ 
            error: 'Patient not found' 
          });
        }

        // Determine department based on symptoms
        const symptomsArray = Array.isArray(symptoms) ? symptoms : symptoms.split(', ');
        let assignedDepartmentId = assignDepartmentBySymptoms(symptomsArray);
        
        // Override with Pediatrics if patient is under 18
        if (parseInt(patientData.age) < 18) {
          assignedDepartmentId = 4; // Pediatrics
        }

        // Get available doctor from the assigned department
        const { data: availableDoctor } = await supabase
          .from('healthStaff')
          .select('id, name, staff_id')
          .eq('department_id', assignedDepartmentId)
          .eq('role', 'Doctor')
          .order('id', { ascending: true })
          .limit(1)
          .single();

        // Create visit record
        const { data: visitData, error: visitError } = await supabase
          .from('visit')
          .insert({
            patient_id: patientData.id,
            visit_date: new Date().toISOString().split('T')[0],
            visit_time: new Date().toTimeString().split(' ')[0],
            appointment_type: appointment_type || 'Walk-in',
            symptoms: Array.isArray(symptoms) ? symptoms.join(', ') : symptoms
          })
          .select()
          .single();

        if (visitError) {
          console.error('💥 Visit creation error:', visitError);
          return res.status(500).json({ 
            error: 'Failed to create visit record',
            details: visitError.message 
          });
        }

        // Generate queue number for the department
        const { data: existingQueue } = await supabase
          .from('queue')
          .select('queue_no')
          .eq('department_id', assignedDepartmentId)
          .order('queue_no', { ascending: false })
          .limit(1);

        const queueNumber = existingQueue.length > 0 ? existingQueue[0].queue_no + 1 : 1;
        
        const { data: queueData, error: queueError } = await supabase
          .from('queue')
          .insert({
            visit_id: visitData.visit_id,
            department_id: assignedDepartmentId,
            queue_no: queueNumber,
            status: 'waiting'
          })
          .select()
          .single();

        // Get department name
        const { data: departmentData } = await supabase
          .from('department')
          .select('name')
          .eq('department_id', assignedDepartmentId)
          .single();

        console.log(`✅ Visit created for: ${patientData.name}`);
        console.log(`📌 Department: ${departmentData?.name || 'Unknown'}, Queue #${queueNumber}`);
        if (availableDoctor) {
          console.log(`📌 Assigned Doctor: ${availableDoctor.name} (${availableDoctor.staff_id})`);
        }

        res.status(201).json({
          success: true,
          visit: visitData,
          queue_number: queueData?.queue_no || queueNumber,
          department: departmentData?.name || 'Internal Medicine',
          assigned_doctor: availableDoctor ? availableDoctor.name : 'Not assigned',
          estimated_wait: '15-30 minutes',
          message: 'Appointment booked successfully'
        });

      } catch (error) {
        console.error('💥 Visit booking error:', error);
        res.status(500).json({ 
          error: 'Internal server error',
          details: error.message 
        });
      }
    });

    // Get Healthcare Provider Profile
    app.get('/api/healthcare/profile', authenticateToken, async (req, res) => {
      try {
        if (req.user.type !== 'healthcare') {
          return res.status(403).json({ error: 'Access denied' });
        }


        const { data: staffData, error } = await supabase
          .from('healthStaff')
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


    // Get Admin Profile
    app.get('/api/admin/profile', authenticateToken, async (req, res) => {
      try {
        if (req.user.type !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
        }


        const { data: adminData, error } = await supabase
          .from('healthAdmin')
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


    // Generate unique temp patient ID
    const generateTempPatientId = () => {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `TEMP${timestamp}${random}`;
    };


    // POST /api/temp-registration - Create new temporary registration
    app.post('/api/temp-registration', async (req, res) => {
      try {
        console.log('📝 Temp registration request:', req.body);
        
        const {
          name,
          birthday,
          age,
          sex,
          address,
          contact_no,
          email,
          emergency_contact_name,
          emergency_contact_relationship,
          emergency_contact_no,
          preferred_time,
          created_date,
          status,
          expires_at
        } = req.body;


        // Generate temp patient ID
        const temp_patient_id = generateTempPatientId();


        // Insert into tempReg table
        const { data: tempRegData, error: tempRegError } = await supabase
          .from('tempReg')
          .insert({
            name,
            birthday,
            age: parseInt(age),
            sex,
            address,
            contact_no,
            email: email.toLowerCase(),
            emergency_contact_name,
            emergency_contact_relationship,
            emergency_contact_no,
            preferred_time,
            created_date,
            status: status || 'pending',
            expires_at,
            temp_patient_id
          })
          .select()
          .single();


        if (tempRegError) {
          console.error('💥 Temp registration error:', tempRegError);
          
          if (tempRegError.code === '23505') { // Unique constraint violation
            return res.status(400).json({
              error: 'Email or contact number already registered. Please use different details.'
            });
          }
          
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


    // PUT /api/temp-registration/:id/health-assessment - Update with health assessment data
    app.put('/api/temp-registration/:id/health-assessment', async (req, res) => {
      try {
        console.log('🩺 Health assessment update for ID:', req.params.id);
        
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


        // Update tempReg with health assessment data
        const { data: updatedData, error: updateError } = await supabase
          .from('tempReg')
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
            status: status || 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('temp_id', id)
          .select()
          .single();


        if (updateError) {
          console.error('💥 Health assessment update error:', updateError);
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


        console.log('✅ Health assessment updated for:', updatedData.name);


        res.json({
          success: true,
          message: 'Health assessment updated successfully',
          data: updatedData
        });


      } catch (error) {
        console.error('💥 Health assessment update error:', error);
        res.status(500).json({
          error: 'Failed to update health assessment. Please try again.',
          details: error.message
        });
      }
    });


    // POST /api/generate-qr-email - Generate QR code and send via email
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
            .from('tempReg')
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


    // GET /api/temp-registration/:tempPatientId - Get registration details for QR display
    app.get('/api/temp-registration/:tempPatientId', async (req, res) => {
      try {
        const { tempPatientId } = req.params;
        
        const { data: regData, error: regError } = await supabase
          .from('tempReg')
          .select('temp_id, temp_patient_id, name, email, symptoms, duration, severity, preferred_date, preferred_time_slot, scheduled_date, status, qr_code')
          .eq('temp_patient_id', tempPatientId)
          .single();
        
        if (regError || !regData) {
          return res.status(404).json({
            error: 'Registration not found'
          });
        }
        
        res.json({
          success: true,
          data: regData
        });
        
      } catch (error) {
        console.error('💥 Get registration error:', error);
        res.status(500).json({
          error: 'Failed to retrieve registration details',
          details: error.message
        });
      }
    });


    // Health Check
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


    // Test email endpoint (remove after testing)
    app.post('/api/test-email', async (req, res) => {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });
        
        await transporter.verify();
        
        const result = await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_USER, // Send to yourself
          subject: 'CliCare Email Test',
          text: 'Email configuration is working!'
        });
        
        res.json({ success: true, messageId: result.messageId });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });


    // Get Patient Profile
    app.get('/api/patient/profile', authenticateToken, async (req, res) => {
      try {
        if (req.user.type !== 'outpatient') {
          return res.status(403).json({ error: 'Access denied' });
        }


        const { data: patientData, error: patientError } = await supabase
          .from('outPatient')
          .select(`
            *,
            emergencyContact(
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


    // Get Patient Visit History
    app.get('/api/patient/history/:patientId', authenticateToken, async (req, res) => {
      try {
        if (req.user.type !== 'outpatient') {
          return res.status(403).json({ error: 'Access denied' });
        }


        const { patientId } = req.params;
        
        // Get patient internal ID
        const { data: patientData } = await supabase
          .from('outPatient')
          .select('id')
          .eq('patient_id', patientId)
          .single();


        if (!patientData) {
          return res.status(404).json({ error: 'Patient not found' });
        }


        // Get visit history
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


    // Start Server
    app.listen(PORT, () => {
      console.log(`🚀 CliCare Backend Server running on port ${PORT}`);
      console.log(`📧 Email OTP: ${emailConfig.auth.user ? '✅ Configured' : '❌ Not configured'}`);
      console.log(`📱 SMS OTP: ${isSMSConfigured ? '✅ iTexMo configured' : '❌ Not configured'}`);
      console.log(`🗄️ Database: ${SUPABASE_URL ? '✅ Connected' : '❌ Not connected'}`);
    });

  app.get('/api/healthcare/lab-requests', authenticateToken, async (req, res) => {
    try {
      if (req.user.type !== 'healthcare') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { data: labRequests, error: labRequestsError } = await supabase
        .from('labRequest')
        .select(`
          *,
          visit!inner(
            visit_id,
            visit_date,
            outPatient!inner(
              patient_id,
              name,
              age,
              sex,
              contact_no
            )
          ),
          labResult(
            result_id,
            file_path,
            upload_date,
            results
          )
        `)
        .eq('staff_id', req.user.id)
        .order('request_id', { ascending: false });

      if (labRequestsError) {
        console.error('Lab requests fetch error:', labRequestsError);
        return res.status(500).json({ error: 'Failed to fetch lab requests' });
      }

      // Format the data to properly handle multiple files per request
      const formattedRequests = labRequests.map(request => {
        let resultData = null;
        let hasMultipleTests = false;

        // Check if this is a grouped request (contains commas)
        const testTypes = request.test_type.split(', ').map(t => t.trim());
        hasMultipleTests = testTypes.length > 1;

        if (request.labResult && request.labResult.length > 0) {
          // Sort results by upload date
          const sortedResults = request.labResult.sort((a, b) => 
            new Date(a.upload_date) - new Date(b.upload_date)
          );

          if (hasMultipleTests && request.labResult.length > 1) {
            // Multiple tests with multiple files
            resultData = {
              isMultiple: true,
              files: sortedResults.map((result, index) => {
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
              upload_date: sortedResults[0].upload_date,
              totalFiles: request.labResult.length
            };
          } else {
            // Single test or single file
            const result = sortedResults[0];
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

        return {
          request_id: request.request_id,
          test_name: request.test_type,
          test_type: request.test_type,
          priority: 'normal',
          status: request.status,
          instructions: '',
          due_date: request.due_date,
          created_at: request.visit.visit_date,
          hasMultipleTests: hasMultipleTests,
          expectedFileCount: testTypes.length,
          uploadedFileCount: request.labResult?.length || 0,
          patient: {
            patient_id: request.visit.outPatient.patient_id,
            name: request.visit.outPatient.name,
            age: request.visit.outPatient.age,
            sex: request.visit.outPatient.sex,
            contact_no: request.visit.outPatient.contact_no
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


  // Get lab results (Doctor side) - FIXED VERSION
  app.get('/api/healthcare/lab-results', authenticateToken, async (req, res) => {
    try {
      if (req.user.type !== 'healthcare') {
        return res.status(403).json({ error: 'Access denied' });
      }


      // Get lab results for requests made by this doctor
      const { data: labResults, error: labResultsError } = await supabase
        .from('labResult')
        .select(`
          *,
          labRequest!inner(
            request_id,
            test_type,
            staff_id,
            visit!inner(
              visit_id,
              visit_date,
              outPatient!inner(
                patient_id,
                name,
                age,
                sex,
                contact_no
              )
            )
          )
        `)
        .eq('labRequest.staff_id', req.user.id)  // Fixed: use staff_id instead of healthstaff_id
        .order('upload_date', { ascending: false });


      if (labResultsError) {
        console.error('Lab results fetch error:', labResultsError);
        return res.status(500).json({ error: 'Failed to fetch lab results' });
      }


      // Format the results for frontend
      const formattedResults = (labResults || []).map(result => ({
        result_id: result.result_id,
        request_id: result.request_id,
        file_name: result.file_path ? result.file_path.split('/').pop() : 'Unknown File',
        file_url: result.file_path,
        upload_date: result.upload_date,
        results: result.results,
        interpretation: result.interpretation,
        test_type: result.labRequest.test_type,
        patient: {
          patient_id: result.labRequest.visit.outPatient.patient_id,
          name: result.labRequest.visit.outPatient.name,
          age: result.labRequest.visit.outPatient.age,
          sex: result.labRequest.visit.outPatient.sex,
          contact_no: result.labRequest.visit.outPatient.contact_no
        },
        visit_date: result.labRequest.visit.visit_date
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


  // Get lab requests for patient (Patient side) - SIMPLIFIED VERSION
  app.get('/api/patient/lab-requests/:patientId', authenticateToken, async (req, res) => {
    try {
      if (req.user.type !== 'outpatient') {
        return res.status(403).json({ error: 'Access denied' });
      }


      const { patientId } = req.params;


      // Verify patient identity
      if (req.user.patientId !== patientId) {
        return res.status(403).json({ error: 'Access denied to other patient data' });
      }


      // Get patient internal ID
      const { data: patientData } = await supabase
        .from('outPatient')
        .select('id, patient_id, name')
        .eq('patient_id', patientId)
        .single();


      if (!patientData) {
        return res.status(404).json({ error: 'Patient not found' });
      }


      // Get patient's visits first
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


      // Get lab requests for patient's visits
      const { data: labRequests, error: labRequestsError } = await supabase
        .from('labRequest')
        .select(`
          *,
          visit!inner(visit_id, visit_date),
          healthStaff!staff_id!inner(name, specialization)
        `)
        .in('visit_id', visitIds)
        .order('request_id', { ascending: false });


      if (labRequestsError) {
        console.error('Patient lab requests fetch error:', labRequestsError);
        return res.status(500).json({ error: 'Failed to fetch lab requests' });
      }


      // Get lab results separately
      const labRequestIds = labRequests.map(req => req.request_id);
      let labResults = [];
      
      if (labRequestIds.length > 0) {
        const { data: resultsData } = await supabase
          .from('labResult')
          .select('*')
          .eq('patient_id', patientData.id)
          .in('request_id', labRequestIds);
        
        labResults = resultsData || [];
      }


      // Format data for patient dashboard
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
            name: request.healthStaff.name,
            department: request.healthStaff.specialization
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


  // Update the lab result upload endpoint to link medical records
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
        .from('outPatient')
        .select('id, patient_id')
        .eq('patient_id', patientId)
        .single();


      if (!patientData) {
        return res.status(404).json({ error: 'Patient not found' });
      }


      // Get lab request with visit info
      const { data: labRequestData } = await supabase
        .from('labRequest')
        .select('request_id, visit_id, status')
        .eq('request_id', labRequestId)
        .single();


      if (!labRequestData) {
        return res.status(404).json({ error: 'Lab request not found' });
      }


      const filePath = `/uploads/lab-results/${file.filename}`;


      // Save lab result
      const { data: labResultData, error: labResultError } = await supabase
        .from('labResult')
        .insert({
          request_id: parseInt(labRequestId),
          patient_id: patientData.id,
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


      // Update lab request status
      await supabase
        .from('labRequest')
        .update({ status: 'completed' })
        .eq('request_id', labRequestId);


      // Update or create medical record with lab result
      const { data: existingMedicalRecord } = await supabase
        .from('medicalRecord')
        .select('record_id')
        .eq('patient_id', patientData.id)
        .eq('visit_id', labRequestData.visit_id)
        .single();


      if (existingMedicalRecord) {
        // Update existing medical record
        await supabase
          .from('medicalRecord')
          .update({ 
            result_id: labResultData.result_id,
            updated_at: new Date().toISOString()
          })
          .eq('record_id', existingMedicalRecord.record_id);
      } else {
        // Create new medical record
        await supabase
          .from('medicalRecord')
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

    app.get('/api/healthcare/my-patients-queue', authenticateToken, async (req, res) => {
      try {
        if (req.user.type !== 'healthcare') {
          return res.status(403).json({ error: 'Access denied' });
        }

        const { date } = req.query;
        const today = new Date().toISOString().split('T')[0];
        const filterDate = date || today;

        // Get doctor's department
        const { data: staffData } = await supabase
          .from('healthStaff')
          .select('department_id, specialization')
          .eq('id', req.user.id)
          .single();

        if (!staffData) {
          return res.status(404).json({ error: 'Staff not found' });
        }

        console.log(`Fetching patients for doctor ${req.user.id}, department ${staffData.department_id}, date ${filterDate}`);

        let allTodayPatients = [];

        // 1. Get ALL patients diagnosed by THIS doctor today (completed consultations)
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
              outPatient!inner(
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
          .eq('staff_id', req.user.id) // Only this doctor's diagnoses
          .eq('visit.visit_date', filterDate)
          .order('created_at', { ascending: false });

        if (completedPatients && !completedError) {
          completedPatients.forEach(item => {
            allTodayPatients.push({
              patient_id: item.visit.outPatient.patient_id,
              name: item.visit.outPatient.name,
              age: item.visit.outPatient.age,
              sex: item.visit.outPatient.sex,
              contact_no: item.visit.outPatient.contact_no,
              email: item.visit.outPatient.email,
              lastVisit: item.visit.visit_date,
              lastSymptoms: item.visit.symptoms,
              queueStatus: 'completed',
              queueNumber: null, // We'll get this separately if needed
              visitTime: item.visit.visit_time,
              isInQueue: false,
              completedAt: item.created_at,
              visit_id: item.visit.visit_id,
              diagnosedByMe: true
            });
          });
        }

        // 2. Get patients currently in queue for this doctor's department (waiting/in_progress)
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
              outPatient!inner(
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
            // Only add if not already in completed list
            const existingPatient = allTodayPatients.find(p => p.patient_id === item.visit.outPatient.patient_id);
            if (!existingPatient) {
              allTodayPatients.push({
                patient_id: item.visit.outPatient.patient_id,
                name: item.visit.outPatient.name,
                age: item.visit.outPatient.age,
                sex: item.visit.outPatient.sex,
                contact_no: item.visit.outPatient.contact_no,
                email: item.visit.outPatient.email,
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

        // 3. ALSO get patients who have been marked as 'completed' in queue but diagnosed by THIS doctor
        const { data: queueCompletedPatients, error: queueCompletedError } = await supabase
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
              outPatient!inner(
                id,
                patient_id,
                name,
                age,
                sex,
                contact_no,
                email
              ),
              diagnosis!inner(
                staff_id,
                created_at
              )
            )
          `)
          .eq('department_id', staffData.department_id)
          .eq('status', 'completed')
          .eq('visit.visit_date', filterDate)
          .eq('visit.diagnosis.staff_id', req.user.id) // Only patients diagnosed by THIS doctor
          .order('queue_no', { ascending: true });

        if (queueCompletedPatients && !queueCompletedError) {
          queueCompletedPatients.forEach(item => {
            // Only add if not already in the list
            const existingPatient = allTodayPatients.find(p => p.patient_id === item.visit.outPatient.patient_id);
            if (!existingPatient) {
              allTodayPatients.push({
                patient_id: item.visit.outPatient.patient_id,
                name: item.visit.outPatient.name,
                age: item.visit.outPatient.age,
                sex: item.visit.outPatient.sex,
                contact_no: item.visit.outPatient.contact_no,
                email: item.visit.outPatient.email,
                lastVisit: item.visit.visit_date,
                lastSymptoms: item.visit.symptoms,
                queueStatus: 'completed',
                queueNumber: item.queue_no,
                visitTime: item.visit.visit_time,
                isInQueue: false,
                visit_id: item.visit.visit_id,
                queue_id: item.queue_id,
                diagnosedByMe: true,
                completedAt: item.visit.diagnosis[0]?.created_at
              });
            } else {
              // Update existing patient with queue info
              existingPatient.queueNumber = item.queue_no;
              existingPatient.queue_id = item.queue_id;
            }
          });
        }

        console.log(`Found ${completedPatients?.length || 0} completed diagnoses, ${queuePatients?.length || 0} queue patients, ${queueCompletedPatients?.length || 0} completed queue patients`);
        console.log(`Total patients for today: ${allTodayPatients.length}`);

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


// Get lab requests (Doctor side) - FIXED VERSION - Group by request_id
app.get('/api/healthcare/lab-requests', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: labRequests, error: labRequestsError } = await supabase
      .from('labRequest')
      .select(`
        *,
        visit!inner(
          visit_id,
          visit_date,
          outPatient!inner(
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

    // Now get all lab results for these requests
    const requestIds = (labRequests || []).map(req => req.request_id);
    let allResults = [];
    
    if (requestIds.length > 0) {
      const { data: resultsData } = await supabase
        .from('labResult')
        .select('*')
        .in('request_id', requestIds)
        .order('upload_date', { ascending: true });
      
      allResults = resultsData || [];
    }

    // Group results by request_id
    const resultsByRequest = allResults.reduce((acc, result) => {
      if (!acc[result.request_id]) {
        acc[result.request_id] = [];
      }
      acc[result.request_id].push(result);
      return acc;
    }, {});

    // Format the data to show one entry per request
    const formattedRequests = (labRequests || []).map(request => {
      const results = resultsByRequest[request.request_id] || [];
      let resultData = null;
      let hasMultipleTests = false;

      // Check if this is a grouped request (contains commas)
      const testTypes = request.test_type.split(', ').map(t => t.trim());
      hasMultipleTests = testTypes.length > 1;

      if (results.length > 0) {
        if (hasMultipleTests && results.length > 1) {
          // Multiple tests with multiple files
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
          // Single test or single file
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

      return {
        request_id: request.request_id,
        test_name: request.test_type,
        test_type: request.test_type,
        priority: 'normal',
        status: request.status,
        instructions: '',
        due_date: request.due_date,
        created_at: request.visit.visit_date,
        hasMultipleTests: hasMultipleTests,
        expectedFileCount: testTypes.length,
        uploadedFileCount: results.length,
        patient: {
          patient_id: request.visit.outPatient.patient_id,
          name: request.visit.outPatient.name,
          age: request.visit.outPatient.age,
          sex: request.visit.outPatient.sex,
          contact_no: request.visit.outPatient.contact_no
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


  // Add this after your existing middleware setup
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


  // Add CORS headers for file serving
  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });


  // Error handling middleware
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


  // Create diagnosis and medical record
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


      // Get patient internal ID
      const { data: patientData } = await supabase
        .from('outPatient')
        .select('id')
        .eq('patient_id', patient_id)
        .single();


      if (!patientData) {
        return res.status(404).json({ error: 'Patient not found' });
      }


      // Create diagnosis record
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


      // Create medical record entry
      const { data: medicalRecordData, error: medicalRecordError } = await supabase
        .from('medicalRecord')
        .insert({
          patient_id: patientData.id,
          visit_id: parseInt(visit_id),
          result_id: result_id ? parseInt(result_id) : null
        })
        .select()
        .single();


      if (medicalRecordError) {
        console.error('Medical record creation error:', medicalRecordError);
        // Don't fail the request if medical record creation fails
        console.warn('Medical record not created, but diagnosis was successful');
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


  // Get complete medical records for a patient
  app.get('/api/healthcare/medical-records/:patientId', authenticateToken, async (req, res) => {
    try {
      if (req.user.type !== 'healthcare') {
        return res.status(403).json({ error: 'Access denied' });
      }


      const { patientId } = req.params;


      // Get patient internal ID
      const { data: patientData } = await supabase
        .from('outPatient')
        .select('id, patient_id, name')
        .eq('patient_id', patientId)
        .single();


      if (!patientData) {
        return res.status(404).json({ error: 'Patient not found' });
      }


      // Get complete medical records
      const { data: medicalRecords, error: medicalRecordsError } = await supabase
        .from('medicalRecord')
        .select(`
          *,
          visit!inner(
            visit_id,
            visit_date,
            visit_time,
            appointment_type,
            symptoms
          ),
          labResult(
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

  // Create grouped lab request (Doctor side)
  app.post('/api/healthcare/lab-requests-grouped', authenticateToken, async (req, res) => {
    try {
      if (req.user.type !== 'healthcare') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { patient_id, test_requests, priority, instructions, due_date, group_name } = req.body;

      if (!patient_id || !test_requests || test_requests.length === 0) {
        return res.status(400).json({ error: 'Patient ID and test requests are required' });
      }

      // Get patient internal ID
      const { data: patientData } = await supabase
        .from('outPatient')
        .select('id, patient_id, name')
        .eq('patient_id', patient_id)
        .single();

      if (!patientData) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Get or create a visit for today
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

      // Create grouped lab request entry
      const groupedTestName = test_requests.map(t => t.test_name).join(', ');
      const groupedTestType = test_requests.map(t => t.test_type).join(', ');

      const { data: labRequestData, error: labRequestError } = await supabase
        .from('labRequest')
        .insert({
          visit_id: visitData.visit_id,
          staff_id: req.user.id,
          test_type: groupedTestType,
          due_date: due_date,
          status: 'pending',
          // Store additional grouped data in a JSON field if your schema supports it
          // Otherwise, we'll use the test_type field to store combined data
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

  // Upload lab result by test (Patient side) - Enhanced for multiple tests
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
        .from('outPatient')
        .select('id, patient_id')
        .eq('patient_id', patientId)
        .single();

      if (!patientData) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Get lab request with visit info
      const { data: labRequestData } = await supabase
        .from('labRequest')
        .select('request_id, visit_id, status, test_type')
        .eq('request_id', labRequestId)
        .single();

      if (!labRequestData) {
        return res.status(404).json({ error: 'Lab request not found' });
      }

      const filePath = `/uploads/lab-results/${file.filename}`;

      // Save lab result with test name
      const { data: labResultData, error: labResultError } = await supabase
        .from('labResult')
        .insert({
          request_id: parseInt(labRequestId),
          patient_id: patientData.id,
          file_path: filePath,
          upload_date: new Date().toISOString().split('T')[0],
          results: JSON.stringify({
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            testName: testName // Store which specific test this file is for
          })
        })
        .select()
        .single();

      if (labResultError) {
        console.error('Lab result save error:', labResultError);
        return res.status(500).json({ error: 'Failed to save lab result' });
      }

      // Check if all tests for this request have been uploaded
      const testTypes = labRequestData.test_type.split(', ');
      const { data: uploadedResults } = await supabase
        .from('labResult')
        .select('results')
        .eq('request_id', labRequestId);

      const uploadedTestNames = uploadedResults?.map(result => {
        try {
          return JSON.parse(result.results).testName;
        } catch {
          return null;
        }
      }).filter(Boolean) || [];

      // If all tests have results uploaded, mark request as completed
      if (uploadedTestNames.length >= testTypes.length) {
        await supabase
          .from('labRequest')
          .update({ status: 'completed' })
          .eq('request_id', labRequestId);
      }

      // Update or create medical record
      const { data: existingMedicalRecord } = await supabase
        .from('medicalRecord')
        .select('record_id')
        .eq('patient_id', patientData.id)
        .eq('visit_id', labRequestData.visit_id)
        .single();

      if (existingMedicalRecord) {
        await supabase
          .from('medicalRecord')
          .update({ 
            result_id: labResultData.result_id,
            updated_at: new Date().toISOString()
          })
          .eq('record_id', existingMedicalRecord.record_id);
      } else {
        await supabase
          .from('medicalRecord')
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

  // Add this NEW endpoint to server.js
  app.get('/api/healthcare/my-patients-today', authenticateToken, async (req, res) => {
    try {
      if (req.user.type !== 'healthcare') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { date } = req.query;
      const today = new Date().toISOString().split('T')[0];
      const filterDate = date || today;

      // Get doctor's department
      const { data: staffData } = await supabase
        .from('healthStaff')
        .select('department_id, specialization')
        .eq('id', req.user.id)
        .single();

      if (!staffData) {
        return res.status(404).json({ error: 'Staff not found' });
      }

      // CRITICAL FIX: Get patients who were diagnosed by THIS SPECIFIC DOCTOR TODAY
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
            outPatient!inner(
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
        .eq('staff_id', req.user.id) // ONLY this doctor's diagnoses
        .eq('visit.visit_date', filterDate) // ONLY today's consultations
        .eq('visit.queue.department_id', staffData.department_id) // Same department
        .order('created_at', { ascending: false });

      if (patientsError) {
        console.error('My today patients fetch error:', patientsError);
        return res.status(500).json({ error: 'Failed to fetch patients' });
      }

      // Format the data
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

      // Remove duplicates if any
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

  // Get Healthcare Dashboard Stats - FIXED VERSION
  app.get('/api/healthcare/dashboard-stats', authenticateToken, async (req, res) => {
    try {
      if (req.user.type !== 'healthcare') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { date } = req.query;
      const today = date || new Date().toISOString().split('T')[0];
      
      // Get doctor's department
      const { data: staffData } = await supabase
        .from('healthStaff')
        .select('department_id, specialization')
        .eq('id', req.user.id)
        .single();

      if (!staffData) {
        return res.status(404).json({ error: 'Staff not found' });
      }

      // Count patients diagnosed by THIS doctor today
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

      // Count patients currently in queue for this doctor's department today
      const { count: queueCount } = await supabase
        .from('queue')
        .select(`
          visit!inner(visit_date)
        `, { count: 'exact' })
        .eq('department_id', staffData.department_id)
        .in('status', ['waiting', 'in_progress'])
        .eq('visit.visit_date', today);

      // FIXED: Count unique lab REQUESTS (not individual results)
      const { count: totalLabRequests } = await supabase
        .from('labRequest')
        .select('*', { count: 'exact' })
        .eq('staff_id', req.user.id)
        .eq('status', 'completed');

      const totalTodayPatients = (myPatientsToday || 0) + (queueCount || 0);

      res.status(200).json({
        success: true,
        stats: {
          myPatientsToday: totalTodayPatients,
          totalLabResults: totalLabRequests || 0, // Now shows lab REQUESTS, not individual files
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

  // Get patient lab history (Enhanced)
  app.get('/api/patient/lab-history/:patientId', authenticateToken, async (req, res) => {
    try {
      if (req.user.type !== 'outpatient') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { patientId } = req.params;
      
      if (req.user.patientId !== patientId) {
        return res.status(403).json({ error: 'Access denied to other patient data' });
      }

      // Get patient internal ID
      const { data: patientData } = await supabase
        .from('outPatient')
        .select('id, patient_id, name')
        .eq('patient_id', patientId)
        .single();

      if (!patientData) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Get unique lab requests with file counts and doctor information
      const { data: labHistory, error: labHistoryError } = await supabase
        .from('labRequest')
        .select(`
          request_id,
          test_type,
          created_at,
          status,
          visit!inner(
            visit_date,
            outPatient!inner(patient_id)
          ),
          healthStaff!staff_id!inner(
            name,
            specialization,
            department_id,
            department!inner(
              name
            )
          ),
          labResult(count)
        `)
        .eq('visit.outPatient.patient_id', patientId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (labHistoryError) {
        console.error('Lab history fetch error:', labHistoryError);
        return res.status(500).json({ error: 'Failed to fetch lab history' });
      }

      // Get first upload date for each request
      const requestIds = (labHistory || []).map(req => req.request_id);
      let uploadDates = {};
      
      if (requestIds.length > 0) {
        const { data: uploadData } = await supabase
          .from('labResult')
          .select('request_id, upload_date')
          .in('request_id', requestIds)
          .order('upload_date', { ascending: true });

        (uploadData || []).forEach(item => {
          if (!uploadDates[item.request_id]) {
            uploadDates[item.request_id] = item.upload_date;
          }
        });
      }

      // Format the results
      const formattedHistory = (labHistory || []).map(request => ({
        request_id: request.request_id,
        test_name: request.test_type,
        test_type: request.test_type,
        request_date: request.created_at,
        completion_date: uploadDates[request.request_id] || null,
        status: 'completed',
        file_count: request.labResult[0]?.count || 0,
        doctor: {
          name: request.healthStaff.name,
          specialization: request.healthStaff.specialization,
          department: request.healthStaff.department.name
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

      // Get patient internal ID
      const { data: patientData } = await supabase
        .from('outPatient')
        .select('id, patient_id')
        .eq('patient_id', req.user.patientId)
        .single();

      if (!patientData) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Get all files for this lab request
      const { data: labFiles, error: labFilesError } = await supabase
        .from('labResult')
        .select(`
          result_id,
          file_path,
          upload_date,
          results,
          labRequest!inner(
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

      // Format the files data
      const formattedFiles = (labFiles || []).map(file => {
        let testName = file.labRequest.test_type;
        let fileName = 'Uploaded File';
        
        try {
          const parsedResults = JSON.parse(file.results);
          testName = parsedResults.testName || testName;
          fileName = parsedResults.originalName || fileName;
        } catch (e) {
          // Use default values if parsing fails
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

      // Get patient internal ID
      const { data: patientData } = await supabase
        .from('outPatient')
        .select('id, patient_id, name')
        .eq('patient_id', patient_id)
        .single();

      if (!patientData) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const today = new Date().toISOString().split('T')[0];

      // Check if visit exists for today
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

      // Create new visit for today
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

  // Get detailed lab statistics
app.get('/api/healthcare/lab-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'healthcare') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Count lab requests by status
    const { data: labRequestStats } = await supabase
      .from('labRequest')
      .select('status')
      .eq('staff_id', req.user.id);

    // Count total files uploaded
    const { count: totalFiles } = await supabase
      .from('labResult')
      .select(`
        labRequest!inner(staff_id)
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


    module.exports = app;