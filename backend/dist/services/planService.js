import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { logger } from '../logger.js';
export class PlanService {
    genAI;
    constructor() {
        if (config.GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
        }
    }
    async generatePlan(prompt, duration, genres, artistInspiration) {
        if (!this.genAI) {
            // Mock plan for development
            return this.generateMockPlan(prompt, duration, genres, artistInspiration);
        }
        const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
        const promptText = `
Create a detailed music production plan for the following request:
Prompt: "${prompt}"
Duration: ${duration} seconds
Genres: ${genres?.join(', ') || 'any'}
Artist Inspiration: ${artistInspiration?.join(', ') || 'none'}

Return a JSON object with this structure:
{
  "title": "Song title",
  "genre": "Genre name",
  "bpm": 120,
  "key": "C Major",
  "structure": [
    {
      "section": "Intro",
      "duration": 15,
      "description": "Description of this section"
    }
  ],
  "instruments": ["piano", "drums", "bass"],
  "mood": "energetic"
}

Ensure the total duration of all sections equals ${duration} seconds.
Be creative and detailed.
`;
        try {
            const result = await model.generateContent(promptText);
            const response = result.response;
            const text = response.text();
            // Parse JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            const plan = JSON.parse(jsonMatch[0]);
            // Validate structure
            if (!plan.structure || !Array.isArray(plan.structure)) {
                throw new Error('Invalid plan structure');
            }
            // Adjust durations to fit exactly
            const totalDuration = plan.structure.reduce((sum, s) => sum + s.duration, 0);
            if (totalDuration !== duration) {
                const ratio = duration / totalDuration;
                plan.structure.forEach(s => {
                    s.duration = Math.round(s.duration * ratio);
                });
            }
            return plan;
        }
        catch (error) {
            logger.error({ error }, 'Failed to generate plan with Gemini');
            return this.generateMockPlan(prompt, duration, genres, artistInspiration);
        }
    }
    generateMockPlan(prompt, duration, genres, artistInspiration) {
        const genre = genres?.[0] || 'Electronic';
        const bpmMap = {
            lofi: 82,
            techno: 128,
            garage: 134,
            dnb: 174,
            ambient: 85,
        };
        const bpm = bpmMap[genre.toLowerCase()] || 120;
        const keys = ["A minor", "C minor", "D minor", "E minor", "G minor"];
        const key = keys[Math.floor(Math.random() * keys.length)];
        return {
            title: `Generated Track: ${prompt.substring(0, 20)}...`,
            genre,
            bpm,
            key,
            structure: [
                { section: 'Intro', duration: Math.floor(duration * 0.2), description: 'Build tension' },
                { section: 'Verse', duration: Math.floor(duration * 0.3), description: 'Main melody' },
                { section: 'Chorus', duration: Math.floor(duration * 0.3), description: 'Hook section' },
                { section: 'Outro', duration: Math.floor(duration * 0.2), description: 'Fade out' },
            ],
            instruments: ['synthesizer', 'drums', 'bass'],
            mood: 'energetic',
        };
    }
}
export const planService = new PlanService();
