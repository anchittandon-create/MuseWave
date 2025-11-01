#!/usr/bin/env node

/**
 * MuseWave Backend API Test Suite
 * Tests all AI music generation endpoints
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const testEndpoint = async (endpoint, payload, description) => {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`📡 POST ${endpoint}`);
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success (${response.status})`);
      console.log(`📊 Response:`, JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      console.log(`❌ Failed (${response.status})`);
      console.log(`🔍 Error:`, data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.log(`💥 Network Error:`, error.message);
    return { success: false, error: error.message };
  }
};

const runTests = async () => {
  console.log('🎵 MuseWave AI Music Generation Backend Test Suite');
  console.log('=' .repeat(60));
  
  const results = {};
  
  // Test 1: Health Check
  results.health = await testEndpoint('/api/health', {}, 'Health Check');
  
  // Test 2: Enhance Prompt
  results.enhancePrompt = await testEndpoint('/api/enhance-prompt', {
    prompt: 'Create an uplifting electronic dance track'
  }, 'AI Prompt Enhancement');
  
  // Test 3: Suggest Genres
  results.suggestGenres = await testEndpoint('/api/suggest-genres', {
    context: {
      prompt: 'Energetic dance music for summer festival',
      mood: 'uplifting',
      existingGenres: ['House']
    }
  }, 'AI Genre Suggestions');
  
  // Test 4: Suggest Artists
  results.suggestArtists = await testEndpoint('/api/suggest-artists', {
    context: {
      prompt: 'Progressive electronic with emotional depth',
      genres: ['Progressive House', 'Trance'],
      mood: 'emotional'
    }
  }, 'AI Artist Suggestions');
  
  // Test 5: Suggest Languages
  results.suggestLanguages = await testEndpoint('/api/suggest-languages', {
    context: {
      prompt: 'Global dance anthem',
      genres: ['House', 'Pop'],
      mood: 'uplifting'
    }
  }, 'AI Language Suggestions');
  
  // Test 6: Suggest Instruments
  results.suggestInstruments = await testEndpoint('/api/suggest-instruments', {
    context: {
      prompt: 'Cinematic electronic with orchestral elements',
      genres: ['Ambient', 'Orchestral'],
      mood: 'epic'
    }
  }, 'AI Instrument Suggestions');
  
  // Test 7: Generate Music Plan
  results.generatePlan = await testEndpoint('/api/generate-music-plan', {
    prompt: 'Epic future bass with emotional breakdown',
    genre: 'Future Bass',
    duration: 180,
    mood: 'epic',
    artistInspiration: ['Flume', 'ODESZA']
  }, 'AI Music Plan Generation');
  
  // Test 8: Enhance Lyrics
  results.enhanceLyrics = await testEndpoint('/api/enhance-lyrics', {
    context: {
      prompt: 'Song about overcoming challenges through music',
      genre: 'Electronic',
      mood: 'inspirational',
      language: 'English'
    }
  }, 'AI Lyrics Enhancement');
  
  // Test 9: Audit Music Plan (using result from previous test)
  if (results.generatePlan.success) {
    results.auditPlan = await testEndpoint('/api/audit-music-plan', {
      plan: results.generatePlan.data.plan || {
        structure: [
          { section: 'Intro', startTime: 0, duration: 16, description: 'Test intro' }
        ],
        arrangement: {
          instruments: ['Synth', 'Drums'],
          tempo: 128,
          key: 'Am'
        }
      },
      requirements: {
        genre: 'Future Bass',
        duration: 180,
        prompt: 'Epic future bass with emotional breakdown'
      }
    }, 'AI Music Plan Audit');
  }
  
  // Test 10: Generate Creative Assets
  results.creativeAssets = await testEndpoint('/api/generate-creative-assets', {
    musicPlan: {
      title: 'Test Track',
      genre: 'Future Bass',
      bpm: 140,
      sections: [
        { name: 'Intro', durationBars: 8 },
        { name: 'Verse', durationBars: 16 },
        { name: 'Chorus', durationBars: 16 }
      ]
    },
    videoStyles: ['Lyric Video', 'Abstract Visualizer'],
    lyrics: 'Verse 1:\\nRising up through the sound\\nChorus:\\nWe are found in the music'
  }, 'AI Creative Assets Generation');
  
  // Test 11: Full Music Generation (Main endpoint)
  results.generateMusic = await testEndpoint('/api/generate-music', {
    prompt: 'Create an epic future bass track with emotional vocals',
    genre: 'Future Bass',
    duration: 120,
    includeVocals: true,
    mood: 'epic',
    artistInspiration: ['Flume'],
    instruments: ['Analog Synth', '808 Drums'],
    language: 'English',
    videoStyles: ['Lyric Video']
  }, 'Full AI Music Generation');
  
  // Summary
  console.log('\\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  
  let passed = 0;
  let total = 0;
  
  for (const [test, result] of Object.entries(results)) {
    total++;
    if (result.success) {
      passed++;
      console.log(`✅ ${test}: PASSED`);
    } else {
      console.log(`❌ ${test}: FAILED`);
    }
  }
  
  console.log(`\\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! MuseWave backend is ready for deployment!');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
  }
  
  return results;
};

// Export for use as module or run directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testEndpoint };