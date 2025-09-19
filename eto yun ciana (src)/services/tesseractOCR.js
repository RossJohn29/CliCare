// tesseractOCR.js - Tesseract OCR Service for ID Recognition
import Tesseract from 'tesseract.js';

/**
 * Main OCR processing function
 * @param {string} imageData - Base64 image data from canvas
 * @returns {Promise<Object>} - OCR result with extracted name
 */
export const processIDWithOCR = async (imageData) => {
  try {
    const { data: { text } } = await Tesseract.recognize(imageData, 'eng', {
      logger: m => console.log('OCR Progress:', m)
    });
    
    console.log('OCR Raw Text Result:', text);
    
    const extractedName = extractNameFromID(text);
    
    return {
      success: !!extractedName,
      name: extractedName,
      rawText: text,
      message: extractedName 
        ? 'Name extracted successfully!' 
        : 'Could not extract name from ID. Please try again or enter manually.'
    };
    
  } catch (error) {
    console.error('OCR processing error:', error);
    return {
      success: false,
      name: null,
      rawText: '',
      message: 'Failed to process ID image. Please try again.',
      error: error.message
    };
  }
};

/**
 * Extract name from OCR text - Enhanced for PLM ID and Philippine Government ID accuracy
 * @param {string} text - Raw OCR text
 * @returns {string|null} - Extracted name or null
 */
export const extractNameFromID = (text) => {
  const lines = text.split('\n').map(line => line.trim().toUpperCase()).filter(line => line.length > 0);
  
  console.log('OCR Processing Lines:', lines);
  
  // Priority 1: PLM ID format detection
  const plmName = extractPLMName(lines);
  if (plmName) {
    console.log('✅ PLM Student name extracted:', plmName);
    return plmName;
  }
  
  // Priority 2: Philippine Government ID format
  console.log('No PLM ID detected, trying Government ID format...');
  const governmentName = extractGovernmentIDName(lines);
  if (governmentName) {
    console.log('✅ Government ID name extracted:', governmentName);
    return governmentName;
  }
  
  // Priority 3: Generic name pattern fallback
  console.log('Trying generic name patterns...');
  const genericName = extractGenericName(lines);
  if (genericName) {
    console.log('✅ Generic name pattern found:', genericName);
    return genericName;
  }
  
  console.log('❌ No valid name found in OCR text');
  return null;
};

/**
 * Extract student name from PLM ID format based on actual PLM ID samples
 * @param {string[]} lines - Array of OCR text lines
 * @returns {string|null} - Extracted PLM student name or null
 */
export const extractPLMName = (lines) => {
  // Check if this is a PLM ID
  const isPLMID = lines.some(line => 
    line.includes('PAMANTASAN') || 
    line.includes('LUNGSOD') || 
    line.includes('MAYNILA') || 
    line.includes('PLM')
  );
  
  if (!isPLMID) {
    return null;
  }
  
  console.log('PLM ID detected, processing lines...');
  
  // Process each line to find the student name
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip institutional headers completely
    if (line.includes('PAMANTASAN') || line.includes('LUNGSOD') || 
        line.includes('MAYNILA') || line.includes('PLM')) {
      continue;
    }
    
    // Skip student number lines (8-10 digits)
    if (/^\d{8,10}$/.test(line.replace(/\s/g, ''))) {
      continue;
    }
    
    // Skip metadata lines
    if (line.includes('STUDENT') || line.includes('NO:') || 
        line.includes('VALID') || line.includes('UNTIL') ||
        line.includes('EXPIRES') || line.includes('ISSUED')) {
      continue;
    }
    
    // Check if this line matches PLM name pattern
    if (isPLMStudentName(line)) {
      const extractedName = cleanPLMName(line);
      console.log('PLM name found:', extractedName);
      return extractedName;
    }
  }
  
  return null;
};

/**
 * Check if a line contains a valid PLM student name based on the samples
 * @param {string} line - Text line to validate
 * @returns {boolean} - True if valid PLM student name
 */
export const isPLMStudentName = (line) => {
  if (!line || line.length < 10 || line.length > 50) {
    return false;
  }
  
  // Must contain only uppercase letters, spaces, and periods
  if (!/^[A-Z\s\.]+$/.test(line)) {
    return false;
  }
  
  const words = line.split(/\s+/).filter(word => word.length > 0);
  
  // PLM names have 3-5 parts: FIRST MIDDLE INITIAL. LAST
  // Examples: "CIANA HUMANE M. LEJARDE", "ESTHEVEN EDWARD M. LADIGNON"
  if (words.length < 3 || words.length > 5) {
    return false;
  }
  
  // All words should be reasonable name lengths
  const hasValidWordLengths = words.every(word => {
    const cleanWord = word.replace('.', '');
    return cleanWord.length >= 1 && cleanWord.length <= 12;
  });
  
  // Should have at least 2 substantial words (longer than 2 chars)
  const substantialWords = words.filter(word => word.replace('.', '').length > 2);
  
  // Exclude lines with institutional terms
  const institutionalTerms = ['UNIVERSITY', 'COLLEGE', 'DEPARTMENT', 'BACHELOR', 
                             'MASTER', 'DEGREE', 'PROGRAM', 'COURSE', 'YEAR',
                             'SEMESTER', 'SECTION', 'MANILA', 'CITY'];
  
  const hasInstitutionalTerms = words.some(word => 
    institutionalTerms.some(term => word.includes(term))
  );
  
  return hasValidWordLengths && substantialWords.length >= 2 && !hasInstitutionalTerms;
};

/**
 * Clean and format the PLM student name
 * @param {string} nameString - Raw name string from OCR
 * @returns {string|null} - Cleaned PLM name
 */
export const cleanPLMName = (nameString) => {
  if (!nameString) return null;
  
  return nameString.trim()
    .replace(/\s+/g, ' ')           // Normalize spaces
    .replace(/\s*\.\s*/g, '. ')     // Standardize period spacing
    .replace(/\.\s*$/, '');         // Remove trailing period if any
};

/**
 * Extract name from Philippine Government ID format
 * @param {string[]} lines - Array of OCR text lines
 * @returns {string|null} - Extracted government ID name or null
 */
export const extractGovernmentIDName = (lines) => {
  const namePattern = /([A-Z\s]+),\s*([A-Z\s]+)/;
  
  for (let line of lines) {
    // Skip government ID headers
    if (line.includes('REPUBLIC') || line.includes('PHILIPPINES') || 
        line.includes('DEPARTMENT') || line.includes('TRANSPORTATION') ||
        line.includes('DRIVER') || line.includes('LICENSE')) {
      continue;
    }
    
    // Look for comma-separated name format (Last, First Middle)
    const nameMatch = line.match(namePattern);
    if (nameMatch) {
      const lastName = nameMatch[1].trim();
      const firstMiddle = nameMatch[2].trim();
      return `${firstMiddle} ${lastName}`;
    }
  }
  
  return null;
};

/**
 * Extract name using generic patterns (fallback method)
 * @param {string[]} lines - Array of OCR text lines
 * @returns {string|null} - Extracted generic name or null
 */
export const extractGenericName = (lines) => {
  for (let line of lines) {
    if (line.length > 8 && line.length < 60 && 
        /^[A-Z\s\.]+$/.test(line) && 
        !line.includes('MALE') && !line.includes('FEMALE') &&
        !line.includes('PHL') && !line.includes('NCR') &&
        !line.includes('PAMANTASAN') && !line.includes('LUNGSOD') &&
        !line.includes('REPUBLIC') && !line.includes('PHILIPPINES')) {
      
      const words = line.split(/\s+/).filter(word => word.length > 1);
      if (words.length >= 2 && words.length <= 5) {
        return line.trim();
      }
    }
  }
  
  return null;
};

/**
 * Utility function to check if camera is available
 * @returns {boolean} - True if camera API is available
 */
export const isCameraAvailable = () => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

/**
 * Initialize camera stream for ID scanning
 * @returns {Promise<MediaStream>} - Camera stream
 */
export const initializeCamera = async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera API not supported in this browser or requires HTTPS');
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment', // Use back camera on mobile
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    });
    
    return stream;
  } catch (err) {
    let errorMessage = '';
    
    if (err.name === 'NotAllowedError') {
      errorMessage = 'Camera permission denied. Please allow camera access and try again.';
    } else if (err.name === 'NotFoundError') {
      errorMessage = 'No camera found on this device.';
    } else if (err.name === 'NotSupportedError') {
      errorMessage = 'Camera not supported on this device or browser.';
    } else {
      errorMessage = 'Camera access failed. Please try again or enter information manually.';
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Cleanup camera stream
 * @param {MediaStream} stream - Camera stream to cleanup
 */
export const cleanupCamera = (stream) => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
};

/**
 * Capture image from video element
 * @param {HTMLVideoElement} videoElement - Video element to capture from
 * @returns {string} - Base64 image data
 */
export const captureImageFromVideo = (videoElement) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  context.drawImage(videoElement, 0, 0);
  
  return canvas.toDataURL('image/jpeg', 0.8);
};

// Default export for the main processing function
export default {
  processIDWithOCR,
  extractNameFromID,
  extractPLMName,
  isPLMStudentName,
  cleanPLMName,
  isCameraAvailable,
  initializeCamera,
  cleanupCamera,
  captureImageFromVideo
};