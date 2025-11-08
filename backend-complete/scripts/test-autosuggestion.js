#!/usr/bin/env node

/**
 * Simple test script for autosuggestion system
 * Tests the Python script directly without the full backend
 */

import { execa } from 'execa';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PYTHON_CMD = join(__dirname, '../venv/bin/python');
const SCRIPT_PATH = join(__dirname, '../src/python/suggestion_engine.py');

async function testAutosuggestion() {
  console.log('🧪 Testing Autosuggestion System\n');
  
  // Test 1: Genres
  console.log('Test 1: Genre Suggestions for "electronic"');
  try {
    const { stdout } = await execa(PYTHON_CMD, [
      SCRIPT_PATH,
      'genres',
      'electronic',
      JSON.stringify({
        musicPrompt: 'upbeat electronic dance music',
        genres: [],
        artistInspiration: [],
        vocalLanguages: []
      })
    ], { timeout: 30000 });
    
    const result = JSON.parse(stdout);
    console.log('✅ Success:', result.suggestions);
  } catch (error) {
    console.log('❌ Failed:', error.message);
    if (error.stderr) console.log('Error output:', error.stderr);
  }
  
  console.log('');
  
  // Test 2: Languages
  console.log('Test 2: Language Suggestions for "eng"');
  try {
    const { stdout } = await execa(PYTHON_CMD, [
      SCRIPT_PATH,
      'vocalLanguages',
      'eng',
      JSON.stringify({
        musicPrompt: 'pop song',
        genres: ['Pop'],
        artistInspiration: [],
        vocalLanguages: []
      })
    ], { timeout: 30000 });
    
    const result = JSON.parse(stdout);
    console.log('✅ Success:', result.suggestions);
  } catch (error) {
    console.log('❌ Failed:', error.message);
    if (error.stderr) console.log('Error output:', error.stderr);
  }
  
  console.log('');
  
  // Test 3: Artists
  console.log('Test 3: Artist Suggestions for "electronic"');
  try {
    const { stdout } = await execa(PYTHON_CMD, [
      SCRIPT_PATH,
      'artistInspiration',
      'electronic',
      JSON.stringify({
        musicPrompt: 'ambient electronic music',
        genres: ['Ambient', 'Electronic'],
        artistInspiration: [],
        vocalLanguages: ['English']
      })
    ], { timeout: 30000 });
    
    const result = JSON.parse(stdout);
    console.log('✅ Success:', result.suggestions);
  } catch (error) {
    console.log('❌ Failed:', error.message);
    if (error.stderr) console.log('Error output:', error.stderr);
  }
  
  console.log('\n✅ Autosuggestion test complete!');
}

testAutosuggestion().catch(console.error);
