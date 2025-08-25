// server.js - Main Express Server for Admin Backend
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const twilio = require('twilio'); // REPLACED axios with twilio
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Environment variables
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Email configuration - FIXED
const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
};

// UPDATED: Twilio SMS configuration (replacing Semaphore)
const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER
};

// Initialize Twilio client
let twilioClient = null;
if (twilioConfig.accountSid && twilioConfig.authToken) {
  twilioClient = twilio(twilioConfig.accountSid, twilioConfig.authToken);
  console.log('✅ Twilio client initialized');
} else {
  console.log('⚠️  Twilio credentials not configured');
}

// Helper function to generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// FIXED: Email OTP function with better error handling
const sendEmailOTP = async (email, otp, patientName) => {
  try {
    console.log('📧 Attempting to send email OTP to:', email);
    console.log('📧 Email config:', { user: emailConfig.auth.user, hasPassword: !!emailConfig.auth.pass });
    
    // FIXED: Use correct nodemailer method
    const transporter = nodemailer.createTransport(emailConfig);
    
    // Test connection first
    await transporter.verify();
    console.log('✅ Email transporter verified successfully');
    
    const mailOptions = {
      from: emailConfig.auth.user,
      to: email,
      subject: 'CLICARE - Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🏥 CLICARE Verification Code</h2>
          <p>Hello ${patientName},</p>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
            ${otp}
          </div>
          <p><strong>This code will expire in 5 minutes.</strong></p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr>
          <p><small>CLICARE Hospital Management System</small></p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return result;
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// UPDATED: Fixed Twilio SMS OTP function
const sendSMSOTP = async (phoneNumber, otp, patientName) => {
  try {
    console.log('📱 Starting Twilio SMS OTP send process...');
    console.log('📱 Phone number received:', phoneNumber);
    console.log('📱 Patient name:', patientName);
    console.log('📱 OTP:', otp);
    
    // Validate Twilio configuration
    if (!twilioClient) {
      throw new Error('Twilio client is not initialized. Check your credentials.');
    }
    
    if (!twilioConfig.phoneNumber) {
      throw new Error('Twilio phone number is not configured');
    }
    
    console.log('📱 Twilio config check passed');
    console.log('📱 From number:', twilioConfig.phoneNumber);
    
    // Clean and format phone number for Philippines
    let cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    console.log('📱 Cleaned phone number:', cleanPhone);
    
    // Handle Philippine number formatting
    let formattedPhone = cleanPhone;
    
    if (cleanPhone.startsWith('+63')) {
      formattedPhone = cleanPhone; // Already properly formatted
    } else if (cleanPhone.startsWith('63')) {
      formattedPhone = '+' + cleanPhone; // Add + prefix
    } else if (cleanPhone.startsWith('0')) {
      formattedPhone = '+63' + cleanPhone.substring(1); // Replace 0 with +63
    } else if (cleanPhone.startsWith('9') && cleanPhone.length === 10) {
      formattedPhone = '+63' + cleanPhone; // Add +63 prefix for 10-digit numbers starting with 9
    } else {
      throw new Error('Invalid phone number format. Please use Philippine format (e.g., 09123456789)');
    }
    
    console.log('📱 Formatted phone:', formattedPhone);
    
    // FIXED: Updated Philippine mobile number regex to accept 10 digits after +639
    // Philippine mobile numbers: +639XXXXXXXXXX (10 digits after +639)
    const phoneRegex = /^\+639\d{9}$/;
    if (!phoneRegex.test(formattedPhone)) {
      console.log('📱 Regex test failed for:', formattedPhone);
      console.log('📱 Expected format: +639XXXXXXXXX (10 digits after +639)');
      throw new Error('Invalid Philippine mobile number format. Must be +639XXXXXXXXX (10 digits after +639)');
    }
    
    console.log('📱 Phone validation passed:', formattedPhone);
    
    // Create message
    const message = `CliCare: Hello ${patientName}, your verification code is ${otp}. This code expires in 5 minutes. Do not share this code with anyone.`;
    console.log('📱 Message content:', message);
    console.log('📱 Message length:', message.length);
    
    // Send SMS using Twilio
    console.log('📱 Sending SMS via Twilio...');
    
    const messageOptions = {
      body: message,
      from: twilioConfig.phoneNumber,
      to: formattedPhone
    };
    
    console.log('📱 Twilio message options:', {
      from: messageOptions.from,
      to: messageOptions.to,
      bodyLength: messageOptions.body.length
    });
    
    const twilioMessage = await twilioClient.messages.create(messageOptions);
    
    console.log('✅ SMS sent successfully via Twilio');
    console.log('📱 Message SID:', twilioMessage.sid);
    console.log('📱 Message Status:', twilioMessage.status);
    console.log('📱 Date Created:', twilioMessage.dateCreated);
    
    return {
      success: true,
      messageSid: twilioMessage.sid,
      status: twilioMessage.status,
      provider: 'twilio'
    };
    
  } catch (error) {
    console.error('💥 Twilio SMS Error Details:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    // Handle Twilio-specific errors
    if (error.code) {
      console.error('Twilio Error Code:', error.code);
      console.error('Twilio Error Details:', error.moreInfo || 'No additional info');
    }
    
    if (error.status) {
      console.error('HTTP Status:', error.status);
    }
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to send SMS';
    
    if (error.code) {
      switch (error.code) {
        case 21211:
          errorMessage = 'Invalid phone number format';
          break;
        case 21408:
          errorMessage = 'Permission to send SMS to this number denied';
          break;
        case 21610:
          errorMessage = 'SMS not allowed to this destination';
          break;
        case 21614:
          errorMessage = 'Invalid sender phone number';
          break;
        case 20003:
          errorMessage = 'Authentication failed - check Twilio credentials';
          break;
        case 20404:
          errorMessage = 'Twilio phone number not found';
          break;
        case 21617:
          errorMessage = 'Phone number is not a valid mobile number';
          break;
        default:
          errorMessage = `Twilio error: ${error.message}`;
      }
    } else if (error.message.includes('not initialized')) {
      errorMessage = 'SMS service not configured properly';
    } else if (error.message.includes('Invalid phone number')) {
      errorMessage = error.message;
    } else {
      errorMessage = `SMS service error: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
};

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

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many login attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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

// Helper function to hash passwords
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Helper function to verify passwords
const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'CLICARE Admin Backend is running',
    timestamp: new Date().toISOString(),
    env: {
      emailConfigured: !!process.env.EMAIL_USER,
      smsConfigured: !!process.env.SEMAPHORE_API_KEY,
      supabaseConfigured: !!SUPABASE_URL
    }
  });
});

// FIXED: Send OTP to Outpatient with comprehensive error handling
app.post('/api/outpatient/send-otp', loginLimiter, async (req, res) => {
  try {
    console.log('🔄 OTP request received:', req.body);
    
    const { patientId, contactInfo, contactType } = req.body;

    // Input validation
    if (!patientId || !contactInfo || !contactType) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        error: 'Patient ID, contact information, and contact type are required' 
      });
    }

    // Validate contact type
    if (!['email', 'phone'].includes(contactType)) {
      return res.status(400).json({ 
        error: 'Contact type must be email or phone' 
      });
    }

    console.log('🔍 Looking for outpatient with ID:', patientId);
    
    // Query the outpatient from Supabase
    const { data: patientData, error: patientError } = await supabase
      .from('outPatient')
      .select('*')
      .eq('patient_id', patientId.toUpperCase())
      .single();

    console.log('Database query result:', { patientData, patientError });

    if (patientError || !patientData) {
      console.log('❌ Outpatient not found');
      return res.status(404).json({ 
        error: 'Patient ID not found' 
      });
    }

    // Verify contact information matches database
    const dbContactInfo = contactType === 'email' ? patientData.email : patientData.contact_no;
    if (dbContactInfo !== contactInfo) {
      console.log('❌ Contact info mismatch. DB:', dbContactInfo, 'Provided:', contactInfo);
      return res.status(400).json({ 
        error: `The ${contactType} doesn't match our records for this Patient ID` 
      });
    }

    console.log('✅ Outpatient found:', patientData.name);

    // Clean up old OTPs for this patient
    await supabase
      .from('otpVerification')
      .delete()
      .eq('patient_id', patientId.toUpperCase())
      .eq('contact_info', contactInfo);

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    console.log('📝 Generated OTP:', otp, 'Expires:', expiresAt);

    // Store OTP in database
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
      console.error('❌ Failed to store OTP:', otpError);
      return res.status(500).json({ 
        error: 'Failed to generate verification code' 
      });
    }

    console.log('✅ OTP stored in database:', otpRecord.id);

    // Send OTP
    try {
      if (contactType === 'email') {
        await sendEmailOTP(contactInfo, otp, patientData.name);
        console.log('📧 Email OTP sent successfully');
      } else {
        await sendSMSOTP(contactInfo, otp, patientData.name);
        console.log('📱 SMS OTP sent successfully');
      }

      res.status(200).json({
        success: true,
        message: `Verification code sent to your ${contactType}`,
        expiresIn: 300 // 5 minutes in seconds
      });

    } catch (sendError) {
      console.error(`❌ Failed to send ${contactType} OTP:`, sendError);
      
      // Delete the stored OTP since sending failed
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
    console.error('💥 Send OTP error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// FIXED: Verify OTP and Login
app.post('/api/outpatient/verify-otp', loginLimiter, async (req, res) => {
  try {
    console.log('🔄 OTP verification request:', req.body);
    
    const { patientId, contactInfo, otp, deviceType } = req.body;

    // Input validation
    if (!patientId || !contactInfo || !otp) {
      return res.status(400).json({ 
        error: 'Patient ID, contact info, and OTP are required' 
      });
    }

    console.log('🔍 Verifying OTP for patient:', patientId);

    // Get the latest OTP for this patient and contact info
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
      console.log('❌ No valid OTP found:', otpError);
      return res.status(400).json({ 
        error: 'Invalid or expired verification code' 
      });
    }

    // Check if OTP matches
    if (otpData.otp_code !== otp) {
      // Increment attempts
      await supabase
        .from('otpVerification')
        .update({ attempts: otpData.attempts + 1 })
        .eq('id', otpData.id);

      console.log('❌ Invalid OTP provided');
      return res.status(400).json({ 
        error: 'Invalid verification code' 
      });
    }

    // Mark OTP as verified
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
        error: 'Patient not found' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: patientData.id,
        patient_id: patientData.patient_id,
        name: patientData.name,
        email: patientData.email,
        contact_no: patientData.contact_no,
        type: 'outpatient',
        device_type: deviceType || 'unknown'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ OTP verified successfully for:', patientData.name);

    // Return success response (without sensitive data)
    const { temp_id, created_at, updated_at, ...patientInfo } = patientData;
    
    res.status(200).json({
      success: true,
      token,
      patient: patientInfo,
      message: 'Login successful',
      deviceType: deviceType || 'unknown'
    });

  } catch (error) {
    console.error('💥 Verify OTP error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Admin Login
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    const { healthadminid, password } = req.body;

    // Input validation
    if (!healthadminid || !password) {
      return res.status(400).json({ 
        error: 'Admin ID and password are required' 
      });
    }

    // Query the admin from Supabase
    console.log('🔍 Looking for admin with ID:', healthadminid);
    
    const { data: adminData, error: adminError } = await supabase
      .from('healthAdmin')
      .select('*')
      .eq('healthadmin_id', healthadminid)
      .single();

    console.log('Database query result:', { adminData, adminError });

    if (adminError || !adminData) {
      console.log('❌ Admin not found in database');
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    console.log('✅ Admin found:', adminData.name);

    // Verify password (temporary plain text comparison for testing)
    console.log('Stored password:', adminData.password);
    console.log('Provided password:', password);
    
    let isValidPassword = false;
    
    // For now, just do plain text comparison since your DB has plain text passwords
    if (adminData.password === password) {
      isValidPassword = true;
      console.log('✅ Plain text password match');
    } else {
      // Try bcrypt comparison in case password is hashed
      try {
        isValidPassword = await verifyPassword(password, adminData.password);
        if (isValidPassword) {
          console.log('✅ Bcrypt password match');
        }
      } catch (error) {
        console.log('❌ Bcrypt comparison failed:', error.message);
      }
    }
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: adminData.id,
        healthadmin_id: adminData.healthadmin_id,
        name: adminData.name,
        position: adminData.position
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Return success response (without password)
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

// Healthcare Provider Login
app.post('/api/healthcare/login', loginLimiter, async (req, res) => {
  try {
    const { staffId, password } = req.body;

    // Input validation
    if (!staffId || !password) {
      return res.status(400).json({ 
        error: 'Staff ID and password are required' 
      });
    }

    // Query the healthcare staff from Supabase
    console.log('🔍 Looking for healthcare staff with ID:', staffId);
    
    const { data: staffData, error: staffError } = await supabase
      .from('healthStaff')
      .select('*')
      .eq('staff_id', staffId)
      .eq('role', 'Doctor') // Only allow doctors
      .single();

    console.log('Database query result:', { staffData, staffError });

    if (staffError || !staffData) {
      console.log('❌ Healthcare staff not found or not a doctor');
      return res.status(401).json({ 
        error: 'Invalid credentials or insufficient permissions' 
      });
    }

    console.log('✅ Healthcare staff found:', staffData.name);

    // Verify password (same logic as admin login)
    console.log('Stored password:', staffData.password);
    console.log('Provided password:', password);
    
    let isValidPassword = false;
    
    // Plain text comparison (since your DB has plain text passwords)
    if (staffData.password === password) {
      isValidPassword = true;
      console.log('✅ Plain text password match');
    } else {
      // Try bcrypt comparison in case password is hashed
      try {
        isValidPassword = await verifyPassword(password, staffData.password);
        if (isValidPassword) {
          console.log('✅ Bcrypt password match');
        }
      } catch (error) {
        console.log('❌ Bcrypt comparison failed:', error.message);
      }
    }
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Generate JWT token
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

    // Return success response (without password)
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

// Get Outpatient Profile
app.get('/api/outpatient/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'outpatient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: patientData, error } = await supabase
      .from('outPatient')
      .select('id, patient_id, name, birthday, age, sex, address, contact_no, email, registration_date')
      .eq('id', req.user.id)
      .single();

    if (error || !patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patientData);
  } catch (error) {
    console.error('Get outpatient profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Admin Profile
app.get('/api/admin/profile', authenticateToken, async (req, res) => {
  try {
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

// Dashboard Stats
app.get('/api/admin/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    // Get patient counts
    const { data: outPatients, error: outError } = await supabase
      .from('outPatient')
      .select('id', { count: 'exact' });

    const { data: inPatients, error: inError } = await supabase
      .from('inPatient')
      .select('id', { count: 'exact' });

    const { data: appointments, error: appointError } = await supabase
      .from('appointments')
      .select('id', { count: 'exact' });

    if (outError || inError || appointError) {
      throw new Error('Database query error');
    }

    // Mock additional stats (you can extend these based on your actual tables)
    const stats = {
      totalPatients: (outPatients?.length || 0) + (inPatients?.length || 0),
      outPatients: outPatients?.length || 0,
      inPatients: inPatients?.length || 0,
      appointments: appointments?.length || 0,
      activeStaff: 12, // This would come from a staff table if you have one
      systemAlerts: 3
    };

    // Recent activities (mock data - you would get this from actual activity logs)
    const recentActivities = [
      {
        id: 1,
        time: '2 min',
        action: 'New patient registration',
        user: 'Dr. Sarah Johnson',
        status: 'success'
      },
      {
        id: 2,
        time: '5 min',
        action: 'Appointment scheduled',
        user: 'Nurse Mike Wilson',
        status: 'success'
      },
      {
        id: 3,
        time: '8 min',
        action: 'System backup completed',
        user: 'System',
        status: 'info'
      },
      {
        id: 4,
        time: '12 min',
        action: 'Lab results updated',
        user: 'Dr. Emily Chen',
        status: 'success'
      },
      {
        id: 5,
        time: '18 min',
        action: 'Equipment maintenance alert',
        user: 'System',
        status: 'warning'
      }
    ];

    // System status
    const systemStatus = {
      server: 'online',
      database: 'online',
      backup: 'completed'
    };

    res.status(200).json({
      success: true,
      stats,
      recentActivities,
      systemStatus
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      error: 'Internal server error fetching dashboard data' 
    });
  }
});

// Get All Admins (for admin management)
app.get('/api/admin/all', authenticateToken, async (req, res) => {
  try {
    const { data: admins, error } = await supabase
      .from('healthAdmin')
      .select('id, healthadmin_id, name, position')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      admins: admins || []
    });

  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({ 
      error: 'Internal server error fetching admins' 
    });
  }
});

// Token validation endpoint
app.post('/api/admin/validate-token', authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    valid: true,
    user: req.user
  });
});

// Admin logout (client-side token removal, but we can log it)
app.post('/api/admin/logout', authenticateToken, (req, res) => {
  // In a more complex setup, you might want to blacklist tokens
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Something went wrong!' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CLICARE Admin Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`📧 Email configured: ${process.env.EMAIL_USER ? '✅' : '❌'}`);
  console.log(`📱 Twilio configured: ${twilioClient ? '✅' : '❌'}`);
  console.log(`📞 Twilio phone configured: ${process.env.TWILIO_PHONE_NUMBER ? '✅' : '❌'}`);
});


module.exports = app;