#!/usr/bin/env node

/**
 * Environment Configuration Checker
 * 
 * Verifies that MuseWave is properly configured for production use.
 * Mock implementations have been removed, so proper backend setup is required.
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
config({ path: join(__dirname, '..', '.env') });

console.log('🔍 Checking MuseWave Configuration...\n');

const checks = {
  passed: [],
  warnings: [],
  errors: []
};

// Check 1: Backend URL
const backendUrl = process.env.VITE_BACKEND_NEO_URL || process.env.BACKEND_NEO_URL;
if (!backendUrl) {
  checks.errors.push('❌ VITE_BACKEND_NEO_URL not set (REQUIRED)');
} else if (backendUrl.includes('localhost')) {
  checks.warnings.push(`⚠️  Backend URL is localhost: ${backendUrl}`);
  checks.warnings.push('   This is OK for development but won\'t work in production');
  checks.passed.push(`✅ VITE_BACKEND_NEO_URL set: ${backendUrl}`);
} else if (backendUrl.includes('example') || backendUrl.includes('your-')) {
  checks.errors.push(`❌ VITE_BACKEND_NEO_URL is placeholder: ${backendUrl}`);
  checks.errors.push('   Replace with your actual backend URL');
} else {
  checks.passed.push(`✅ VITE_BACKEND_NEO_URL set: ${backendUrl}`);
}

// Check 2: API Key
const apiKey = process.env.VITE_API_KEY || process.env.DEFAULT_API_KEY;
if (!apiKey) {
  checks.errors.push('❌ VITE_API_KEY not set (REQUIRED)');
} else if (apiKey.includes('your-') || apiKey === 'your-api-key-here') {
  checks.errors.push(`❌ VITE_API_KEY is placeholder: ${apiKey}`);
  checks.errors.push('   Replace with your actual API key');
} else if (apiKey === 'dev-key-123' && !backendUrl?.includes('localhost')) {
  checks.warnings.push('⚠️  Using development API key in production');
  checks.warnings.push('   Consider using a more secure key');
  checks.passed.push(`✅ VITE_API_KEY set: ${apiKey.substring(0, 8)}...`);
} else {
  checks.passed.push(`✅ VITE_API_KEY set: ${apiKey.substring(0, 8)}...`);
}

// Check 3: Gemini API Key (optional)
const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!geminiKey) {
  checks.warnings.push('⚠️  VITE_GEMINI_API_KEY not set (optional)');
  checks.warnings.push('   AI suggestions will use simpler logic');
} else if (geminiKey.includes('your_') || geminiKey === 'your-gemini-api-key') {
  checks.warnings.push('⚠️  VITE_GEMINI_API_KEY is placeholder');
} else {
  checks.passed.push('✅ VITE_GEMINI_API_KEY set');
}

// Print results
console.log('═══════════════════════════════════════════════\n');

if (checks.passed.length > 0) {
  console.log('✅ PASSED CHECKS:\n');
  checks.passed.forEach(msg => console.log('  ' + msg));
  console.log('');
}

if (checks.warnings.length > 0) {
  console.log('⚠️  WARNINGS:\n');
  checks.warnings.forEach(msg => console.log('  ' + msg));
  console.log('');
}

if (checks.errors.length > 0) {
  console.log('❌ ERRORS:\n');
  checks.errors.forEach(msg => console.log('  ' + msg));
  console.log('');
}

console.log('═══════════════════════════════════════════════\n');

// Final verdict
if (checks.errors.length > 0) {
  console.log('❌ Configuration FAILED\n');
  console.log('Required environment variables are missing or invalid.');
  console.log('');
  console.log('Quick Fix:');
  console.log('  1. Copy .env.example to .env');
  console.log('  2. Set VITE_BACKEND_NEO_URL to your backend URL');
  console.log('  3. Set VITE_API_KEY to your API key');
  console.log('');
  console.log('For complete setup instructions, see PRODUCTION_SETUP.md');
  console.log('');
  process.exit(1);
} else if (checks.warnings.length > 0) {
  console.log('⚠️  Configuration OK with warnings\n');
  console.log('The app will work, but check warnings above for potential issues.');
  console.log('');
  process.exit(0);
} else {
  console.log('✅ Configuration PERFECT\n');
  console.log('All required environment variables are set correctly!');
  console.log('');
  process.exit(0);
}
