// server.js - Updated with iTexMo SMS Implementation
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const axios = require('axios'); // For iTexMo API calls
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Environment variables
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// In-memory store for failed login attempts per account
const failedAttempts = new Map();

// Function to check and update failed attempts per account
const checkAccountRateLimit = (identifier) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  
  if (!failedAttempts.has(identifier)) {
    failedAttempts.set(identifier, []);
  }
  
  const attempts = failedAttempts.get(identifier);
  
  // Remove attempts older than the window
  const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
  failedAttempts.set(identifier, recentAttempts);
  
  // Check if exceeded max attempts
  if (recentAttempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...recentAttempts);
    const timeLeft = windowMs - (now - oldestAttempt);
    const minutesLeft = Math.ceil(timeLeft / 60000);
    
    throw new Error(`Too many failed login attempts for this account. Try again in ${minutesLeft} minutes.`);
  }
};

// Function to record a failed attempt
const recordFailedAttempt = (identifier) => {
  if (!failedAttempts.has(identifier)) {
    failedAttempts.set(identifier, []);
  }
  
  const attempts = failedAttempts.get(identifier);
  attempts.push(Date.now());
  failedAttempts.set(identifier, attempts);
};

// Function to clear attempts on successful login
const clearFailedAttempts = (identifier) => {
  failedAttempts.delete(identifier);
};

// Email configuration
const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
};

// iTexMo SMS configuration
const ITEXMO_CONFIG = {
  apiKey: process.env.ITEXMO_API_KEY,
  senderId: process.env.ITEXMO_SENDER_ID || 'CLICARE',
  apiUrl: 'https://www.itexmo.com/php_api/api.php'
};

// Check SMS configuration
const isSMSConfigured = ITEXMO_CONFIG.apiKey && ITEXMO_CONFIG.apiKey !== 'PR-SAMPL123456_ABCDE';

if (isSMSConfigured) {
  console.log('✅ iTexMo SMS configuration found - SMS OTP will be available');
} else {
  console.log('⚠️ iTexMo not configured - only Email OTP will be available');
  console.log('📝 To enable SMS: Set ITEXMO_API_KEY in your .env file');
}

// Helper function to generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Email OTP function
const sendEmailOTP = async (email, otp, patientName) => {
  try {
    console.log('📧 Attempting to send email OTP to:', email);
    
    // ✅ FIXED: Changed from createTransporter to createTransport
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

// NEW: iTexMo SMS sending function
const sendSMSOTP = async (phoneNumber, otp, patientName) => {
  try {
    console.log('📱 Attempting to send SMS OTP via iTexMo to:', phoneNumber);
    
    if (!isSMSConfigured) {
      throw new Error('SMS service not configured. Please contact administrator.');
    }
    
    // Format phone number for iTexMo (Philippine format)
    let formattedPhone = phoneNumber.toString().trim();
    
    // Convert to 09XX format for iTexMo
    if (formattedPhone.startsWith('+639')) {
      formattedPhone = '0' + formattedPhone.substring(3);
    } else if (formattedPhone.startsWith('639')) {
      formattedPhone = '0' + formattedPhone.substring(2);
    }
    
    // Validate Philippine mobile number
    if (!/^09\d{9}$/.test(formattedPhone)) {
      throw new Error('Invalid Philippine mobile number format');
    }
    
    console.log('📱 Formatted phone for iTexMo:', formattedPhone);
    
    // Prepare SMS message
    const message = `CLICARE: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code.`;
    
    // iTexMo API parameters
    const params = {
      '1': formattedPhone,
      '2': message,
      '3': ITEXMO_CONFIG.apiKey,
      passwd: ITEXMO_CONFIG.apiKey.split('_')[1] || 'default' // Extract password from API key
    };
    
    console.log('📱 Sending SMS via iTexMo API...');
    
    // Make API request to iTexMo
    const response = await axios.post(ITEXMO_CONFIG.apiUrl, new URLSearchParams(params), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log('📱 iTexMo API response:', response.data);
    
    // Check iTexMo response
    if (response.data && response.data.toString().trim() === '0') {
      console.log('✅ SMS sent successfully via iTexMo');
      return {
        success: true,
        messageId: 'itexmo_' + Date.now(),
        provider: 'iTexMo'
      };
    } else {
      // iTexMo error codes
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
      
      console.error('❌ iTexMo SMS failed:', errorMessage);
      throw new Error(`SMS sending failed: ${errorMessage}`);
    }
    
  } catch (error) {
    console.error('❌ SMS sending error:', error);
    
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

// Keep a lighter IP-based limiter as backup (higher limit)
const generalLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Higher limit per IP (backup protection)
  message: {
    error: 'Too many requests from this network. Please try again later.',
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

// Helper functions
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Routes
// Healthcare Provider Login
app.post('/api/healthcare/login', generalLoginLimiter, async (req, res) => {
  try {
    const { staffId, password } = req.body;

    // Input validation
    if (!staffId || !password) {
      return res.status(400).json({ 
        error: 'Staff ID and password are required' 
      });
    }

    // Check per-account rate limiting BEFORE database query
    try {
      checkAccountRateLimit(`healthcare:${staffId.toLowerCase()}`);
    } catch (rateLimitError) {
      return res.status(429).json({ 
        error: rateLimitError.message 
      });
    }

    // Query ANY healthcare staff from Supabase (removed doctor-only restriction)
    console.log('🔍 Looking for healthcare staff with ID:', staffId);
    
    const { data: staffData, error: staffError } = await supabase
      .from('healthStaff')
      .select('*')
      .eq('staff_id', staffId)
      .single();

    console.log('Database query result:', { staffData, staffError });

    if (staffError || !staffData) {
      console.log('❌ Healthcare staff not found'); 
      recordFailedAttempt(`healthcare:${staffId.toLowerCase()}`);
      return res.status(404).json({ 
        error: 'Healthcare Provider ID not found' 
      });
    }

    console.log('✅ Healthcare staff found:', staffData.name, 'Role:', staffData.role);

    // Verify password
    let isValidPassword = false;
    
    if (staffData.password === password) {
      isValidPassword = true;
      console.log('✅ Plain text password match');
    } else {
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
      // Record failed attempt for this account
      recordFailedAttempt(`healthcare:${staffId.toLowerCase()}`);
      return res.status(401).json({ 
        error: 'Incorrect password' 
      });
    }

    // SUCCESS - Clear any failed attempts for this account
    clearFailedAttempts(`healthcare:${staffId.toLowerCase()}`);

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

// Admin Login
app.post('/api/admin/login', generalLoginLimiter, async (req, res) => {
  try {
    const { healthadminid, password } = req.body;

    // Input validation
    if (!healthadminid || !password) {
      return res.status(400).json({ 
        error: 'Admin ID and password are required' 
      });
    }

    // Check per-account rate limiting BEFORE database query
    try {
      checkAccountRateLimit(`admin:${healthadminid.toLowerCase()}`);
    } catch (rateLimitError) {
      return res.status(429).json({ 
        error: rateLimitError.message 
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
      // Record failed attempt for this account
      recordFailedAttempt(`admin:${healthadminid.toLowerCase()}`);
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    console.log('✅ Admin found:', adminData.name);

    // Verify password
    let isValidPassword = false;
    
    if (adminData.password === password) {
      isValidPassword = true;
      console.log('✅ Plain text password match');
    } else {
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
      // Record failed attempt for this account
      recordFailedAttempt(`admin:${healthadminid.toLowerCase()}`);
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // SUCCESS - Clear any failed attempts for this account
    clearFailedAttempts(`admin:${healthadminid.toLowerCase()}`);

    // Generate JWT token
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'CLICARE Admin Backend is running',
    timestamp: new Date().toISOString(),
    env: {
      emailConfigured: !!process.env.EMAIL_USER,
      smsConfigured: isSMSConfigured,
      supabaseConfigured: !!SUPABASE_URL,
      smsProvider: 'iTexMo'
    }
  });
});

// UPDATED: Send OTP to Outpatient with iTexMo SMS support
app.post('/api/outpatient/send-otp', generalLoginLimiter, async (req, res) => {
  try {
    console.log('📄 OTP request received:', req.body);
    
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

    // Check if SMS is requested but not configured
    if (contactType === 'phone' && !isSMSConfigured) {
      return res.status(400).json({ 
        error: 'SMS verification is not configured. Please use email verification or contact support.'
      });
    }

    console.log('🔍 Looking for patient:', patientId);

    // ✅ FIXED: Changed from 'outpatients' to 'outPatient'
    const { data: patientData, error: patientError } = await supabase
      .from('outPatient')  // ✅ Corrected table name
      .select('*')
      .eq('patient_id', patientId.toUpperCase())
      .single();

    if (patientError || !patientData) {
      console.log('❌ Patient not found:', patientError);
      return res.status(404).json({ 
        error: 'Patient ID not found. Please check your Patient ID.' 
      });
    }

    // Verify contact information matches database
    const dbContactInfo = contactType === 'email' 
      ? patientData.email 
      : patientData.contact_no;
      
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

    console.log('🔑 Generated OTP:', otp, 'Expires:', expiresAt);

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
        // Send email OTP
        await sendEmailOTP(contactInfo, otp, patientData.name);
        console.log('📧 Email OTP sent successfully');

        res.status(200).json({
          success: true,
          message: 'Verification code sent to your email',
          expiresIn: 300 // 5 minutes in seconds
        });

      } else if (contactType === 'phone') {
        // Send SMS OTP via iTexMo
        await sendSMSOTP(contactInfo, otp, patientData.name);
        console.log('📱 SMS OTP sent successfully via iTexMo');

        res.status(200).json({
          success: true,
          message: 'Verification code sent to your phone',
          expiresIn: 300, // 5 minutes in seconds
          provider: 'iTexMo'
        });
      }

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

// Verify OTP and Login
app.post('/api/outpatient/verify-otp', generalLoginLimiter, async (req, res) => {
  try {
    console.log('📄 OTP verification request:', req.body);
    
    const { patientId, contactInfo, otp, deviceType } = req.body;

    // Input validation
    if (!patientId || !contactInfo || !otp) {
      return res.status(400).json({ 
        error: 'Patient ID, contact info, and OTP are required' 
      });
    }

    console.log('🔑 Verifying OTP for patient:', patientId);

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

    // ✅ FIXED: Changed from 'outpatients' to 'outPatient'
    const { data: patientData, error: patientError } = await supabase
      .from('outPatient')  // ✅ Corrected table name
      .select('*')
      .eq('patient_id', patientId.toUpperCase())
      .single();

    if (patientError || !patientData) {
      console.log('❌ Patient not found during verification');
      return res.status(404).json({ 
        error: 'Patient data not found' 
      });
    }

    // Generate JWT token
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

    console.log('✅ OTP verification successful for:', patientData.name);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      patient: {
        patient_id: patientData.patient_id,
        name: patientData.name,
        email: patientData.email,
        contact_no: patientData.contact_no,
        birthday: patientData.birthday,  // Fixed field name
        age: patientData.age,
        sex: patientData.sex,            // Fixed field name
        address: patientData.address
      }
    });

  } catch (error) {
    console.error('💥 Verify OTP error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CLICARE Backend Server running on port ${PORT}`);
  console.log(`📧 Email OTP: ${emailConfig.auth.user ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`📱 SMS OTP: ${isSMSConfigured ? '✅ iTexMo configured' : '❌ Not configured'}`);
  console.log(`🗄️ Database: ${SUPABASE_URL ? '✅ Connected' : '❌ Not connected'}`);
});

module.exports = app;