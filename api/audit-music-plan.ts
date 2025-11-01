import { VercelRequest, VercelResponse } from '@vercel/node';

interface AuditMusicPlanRequest {
  plan: {
    structure: any[];
    arrangement: any;
    production: any;
  };
  requirements: {
    genre: string;
    duration: number;
    prompt: string;
  };
}

interface AuditResult {
  isValid: boolean;
  score: number;
  feedback: {
    strengths: string[];
    issues: string[];
    suggestions: string[];
  };
  adjustments?: any;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { plan, requirements }: AuditMusicPlanRequest = req.body;
    
    if (!plan || !requirements) {
      res.status(400).json({ error: 'Missing required fields: plan, requirements' });
      return;
    }
    
    // Try Gemini audit if available
    if (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) {
      try {
        const audit = await auditWithGemini(plan, requirements);
        res.status(200).json({ audit });
        return;
      } catch (error) {
        console.warn('Gemini audit failed, using fallback:', error.message);
      }
    }
    
    // Fallback audit
    const audit = auditPlanFallback(plan, requirements);
    res.status(200).json({ audit });
    
  } catch (error) {
    console.error('Music plan audit error:', error);
    res.status(500).json({ 
      error: 'Music plan audit failed',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function auditWithGemini(plan: any, requirements: any): Promise<AuditResult> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Audit this music plan against the requirements:

PLAN:
${JSON.stringify(plan, null, 2)}

REQUIREMENTS:
Genre: ${requirements.genre}
Duration: ${requirements.duration} seconds
Prompt: "${requirements.prompt}"

Analyze the plan for:
1. Genre appropriateness (tempo, instruments, structure)
2. Duration accuracy (sections should sum to target duration)
3. Creative alignment with the prompt
4. Technical feasibility
5. Musical coherence

Return ONLY a valid JSON object in this exact format:

{
  "isValid": true,
  "score": 8.5,
  "feedback": {
    "strengths": ["Good tempo for genre", "Creative instrument selection"],
    "issues": ["Duration mismatch", "Missing key instruments"],
    "suggestions": ["Add more percussion", "Extend breakdown section"]
  },
  "adjustments": {
    "tempo": 130,
    "addInstruments": ["Percussion"],
    "extendSection": "breakdown"
  }
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in Gemini response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

function auditPlanFallback(plan: any, requirements: any): AuditResult {
  const feedback = {
    strengths: [] as string[],
    issues: [] as string[],
    suggestions: [] as string[]
  };
  
  let score = 10;
  
  // Check duration accuracy
  const totalDuration = plan.structure?.reduce((sum: number, section: any) => sum + section.duration, 0) || 0;
  const durationDiff = Math.abs(totalDuration - requirements.duration);
  
  if (durationDiff <= 2) {
    feedback.strengths.push('Duration matches requirements perfectly');
  } else if (durationDiff <= 10) {
    feedback.issues.push(`Duration is ${durationDiff}s off target`);
    feedback.suggestions.push('Adjust section lengths to match target duration');
    score -= 1;
  } else {
    feedback.issues.push(`Duration is significantly off (${durationDiff}s difference)`);
    feedback.suggestions.push('Major restructure needed to match duration');
    score -= 3;
  }
  
  // Check genre appropriateness
  const genre = requirements.genre.toLowerCase();
  const tempo = plan.arrangement?.tempo || 120;
  const instruments = plan.arrangement?.instruments || [];
  
  // Genre-specific tempo checks
  const genreTempos: Record<string, [number, number]> = {
    'house': [120, 130],
    'techno': [125, 140],
    'dubstep': [130, 150],
    'ambient': [60, 100],
    'trap': [135, 150],
    'trance': [130, 145],
    'dnb': [160, 180],
    'drum and bass': [160, 180]
  };
  
  const expectedTempo = genreTempos[genre];
  if (expectedTempo) {
    if (tempo >= expectedTempo[0] && tempo <= expectedTempo[1]) {
      feedback.strengths.push('Tempo appropriate for genre');
    } else {
      feedback.issues.push(`Tempo ${tempo} BPM unusual for ${requirements.genre}`);
      feedback.suggestions.push(`Consider tempo range ${expectedTempo[0]}-${expectedTempo[1]} BPM`);
      score -= 1;
    }
  }
  
  // Check instrument selection
  const essentialInstruments: Record<string, string[]> = {
    'house': ['kick', 'bass'],
    'techno': ['kick', 'bass', 'hi-hat'],
    'dubstep': ['bass', 'snare'],
    'ambient': ['pad'],
    'trap': ['808', 'hi-hat'],
    'trance': ['kick', 'bass', 'lead']
  };
  
  const required = essentialInstruments[genre] || [];
  const missing = required.filter(inst => 
    !instruments.some((i: string) => i.toLowerCase().includes(inst))
  );
  
  if (missing.length === 0 && required.length > 0) {
    feedback.strengths.push('All essential instruments present');
  } else if (missing.length > 0) {
    feedback.issues.push(`Missing essential instruments: ${missing.join(', ')}`);
    feedback.suggestions.push(`Add ${missing.join(', ')} for authentic ${requirements.genre} sound`);
    score -= missing.length;
  }
  
  // Check structure coherence
  if (plan.structure?.length >= 3) {
    feedback.strengths.push('Good structural variety');
  } else {
    feedback.suggestions.push('Consider adding more structural sections for interest');
    score -= 0.5;
  }
  
  // Check production setup
  if (plan.production?.effects?.length >= 3) {
    feedback.strengths.push('Comprehensive effects selection');
  } else {
    feedback.suggestions.push('Add more effects for professional sound');
  }
  
  return {
    isValid: score >= 6,
    score: Math.max(0, Math.min(10, score)),
    feedback,
    adjustments: missing.length > 0 ? { addInstruments: missing } : undefined
  };
}