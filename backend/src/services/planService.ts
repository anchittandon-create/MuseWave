import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { logger } from '../logger.js';

export interface MusicPlan {
  title: string;
  genre: string;
  bpm: number;
  key: string;
  structure: Array<{
    section: string;
    duration: number;
    description: string;
  }>;
  instruments: string[];
  mood: string;
}

export class PlanService {
  private genAI?: GoogleGenerativeAI;

  constructor() {
    if (config.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    }
  }

  private getGenreGuidance(genre: string): string {
    const guidance: Record<string, string> = {
      'lofi': `
- Use lo-fi production techniques: vinyl crackle, tape saturation, bit crushing
- Incorporate jazzy chord progressions (7th, 9th chords)
- Prominent drum elements: dusty kick, snappy snare, crisp hi-hats
- Melodic elements: Rhodes, warm bass, vinyl samples, atmospheric pads
- Tempo: 70-90 BPM with laid-back swing feel
- Mood: Nostalgic, chill, introspective, study/relax vibes`,
      'techno': `
- Driving 4/4 kick pattern with industrial precision
- Hypnotic, repetitive elements that evolve subtly
- Analog synth sounds: TB-303 style bass, modular bleeps
- Heavy use of filters, delays, and reverb
- Tempo: 125-135 BPM with mechanical precision
- Mood: Dark, hypnotic, relentless energy`,
      'house': `
- Four-on-the-floor kick drum pattern
- Soulful or funky elements depending on subgenre
- Piano stabs, vocal chops, or organ riffs
- Grooving bassline that locks with the kick
- Tempo: 120-130 BPM with danceable groove
- Mood: Uplifting, energetic, feel-good vibes`,
      'ambient': `
- Ethereal pads and long, evolving textures
- Minimal rhythmic elements, focus on atmosphere
- Field recordings, nature sounds, or found sounds
- Heavy reverb and delay for spatial depth
- Tempo: 60-90 BPM or no fixed tempo
- Mood: Meditative, spacious, contemplative`,
      'hip-hop': `
- Head-nodding drum break or trap-style hi-hats
- Deep sub-bass or 808 bass patterns
- Sampling or sample-inspired melodies
- Space for vocals (even if instrumental)
- Tempo: 85-115 BPM with laid-back groove
- Mood: Varies from introspective to aggressive`,
      'dnb': `
- Fast breakbeats at 160-180 BPM
- Deep, rolling basslines (reese bass style)
- Syncopated rhythms and complex drum patterns
- Atmospheric pads and stabs for tension
- High energy throughout with build-ups
- Mood: Intense, energetic, dark or liquid depending on style`,
      'pop': `
- Catchy melodic hooks and memorable chorus
- Clear verse-chorus-verse structure
- Polished, radio-ready production quality
- Vocal-forward mix with supporting instrumentation
- Tempo: 100-130 BPM with strong groove
- Mood: Uplifting, relatable, emotionally accessible`,
      'rock': `
- Guitar-driven arrangements with power chords
- Dynamic contrast between verses and choruses
- Live drum feel with emphasis on groove and impact
- Bass that locks with drums for solid rhythm section
- Tempo: 90-140 BPM depending on energy level
- Mood: Raw, energetic, rebellious or introspective`,
      'electronic': `
- Synthesizer-based sound palette
- Programmed or electronic drums with precision
- Use of effects: delay, reverb, distortion, modulation
- Layered textures building throughout the track
- Tempo: Varies widely (80-140 BPM) based on subgenre
- Mood: Modern, synthetic, can range from chill to intense`,
      'jazz': `
- Complex chord progressions with extensions (9ths, 11ths, 13ths)
- Improvisation-inspired melodic phrases
- Swing or syncopated rhythmic feel
- Acoustic instruments or jazz-style electric sounds
- Tempo: 80-180 BPM depending on style (ballad to bebop)
- Mood: Sophisticated, expressive, conversational`,
      'classical': `
- Orchestral or chamber ensemble instrumentation
- Traditional compositional forms and development
- Dynamic expression and articulation
- Harmonic sophistication with modulations
- Tempo: Varies with musical phrases (rubato common)
- Mood: Elegant, dramatic, emotionally nuanced`,
    };
    
    const lowerGenre = genre.toLowerCase();
    for (const [key, guide] of Object.entries(guidance)) {
      if (lowerGenre.includes(key)) {
        return guide;
      }
    }
    return 'Use your expertise to match the genre conventions and create authentic production';
  }

  async generatePlan(prompt: string, duration: number, genres?: string[], artistInspiration?: string[]): Promise<MusicPlan> {
    if (!this.genAI) {
      // Mock plan for development
      return this.generateMockPlan(prompt, duration, genres, artistInspiration);
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

    const promptText = `You are an expert music producer and composer with deep knowledge of music theory, production techniques, and various musical genres. Your task is to create a HIGHLY DETAILED and COMPREHENSIVE music production plan.

**USER REQUEST:**
- Prompt: "${prompt}"
- Duration: ${duration} seconds (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})
- Primary Genres: ${genres?.join(', ') || 'any genre that fits the prompt'}
- Artist/Producer Inspiration: ${artistInspiration?.join(', ') || 'use your creative judgment'}

**IMPORTANT INSTRUCTIONS:**
1. Analyze the user's prompt deeply - consider the mood, energy level, imagery, and emotional intent
2. Choose a BPM that matches the genre conventions and desired energy:
   - Lofi/Trip-hop: 70-90 BPM
   - Hip-hop: 85-115 BPM
   - House: 120-130 BPM
   - Techno: 125-135 BPM
   - Drum & Bass: 160-180 BPM
   - Ambient/Downtempo: 60-90 BPM
3. Select a musical key that evokes the right emotion:
   - Minor keys (Am, Dm, Em, Gm, Cm) for melancholic, introspective, dark moods
   - Major keys (C, G, D, F, A) for uplifting, happy, energetic moods
   - Modal scales (Dorian, Mixolydian) for jazzy, sophisticated feels
4. Create a detailed song structure with SPECIFIC descriptions for each section
5. List instruments that are authentic to the genre and production style
6. Define the overall mood with nuanced descriptors

**DETAILED STRUCTURE REQUIREMENTS:**
- For ${duration} second tracks, create 4-6 distinct sections
- Each section should have:
  * A clear name (Intro, Verse 1, Pre-Chorus, Chorus, Bridge, Break, Build-up, Drop, Outro, etc.)
  * Exact duration in seconds that adds up to ${duration} total
  * A DETAILED description (at least 2-3 sentences) explaining:
    - What musical elements are introduced or emphasized
    - The emotional journey or narrative arc
    - Specific production techniques (filters, reverb, layering, etc.)
    - Melodic or rhythmic characteristics
    - How it connects to adjacent sections

**GENRE-SPECIFIC CONSIDERATIONS:**
${genres && genres.length > 0 ? `
Primary Genre: ${genres[0]}
${this.getGenreGuidance(genres[0])}
` : 'Use your expertise to match the prompt'}

${artistInspiration && artistInspiration.length > 0 ? `
**ARTIST INSPIRATION ANALYSIS:**
Consider the production styles of: ${artistInspiration.join(', ')}
- What makes their sound unique?
- What instruments, effects, or techniques do they use?
- What emotional quality defines their music?
- How can we capture that essence in this track?
` : ''}

**OUTPUT FORMAT:**
Return ONLY a valid JSON object (no markdown, no explanation) with this EXACT structure:

{
  "title": "A creative, evocative song title that captures the essence (5-10 words)",
  "genre": "The primary genre with subgenre if applicable (e.g., 'Atmospheric Lofi Hip-Hop', 'Progressive House', 'Jazz Fusion')",
  "bpm": <number between 60-180>,
  "key": "Musical key with scale (e.g., 'A minor', 'F# Dorian', 'Eb Major')",
  "structure": [
    {
      "section": "Section name",
      "duration": <number of seconds>,
      "description": "DETAILED 3-5 sentence description of this section including musical elements, production techniques, emotional arc, and how it connects to the overall composition"
    }
  ],
  "instruments": ["List 8-12 specific instruments or sound design elements that will be used, being genre-specific and detailed (e.g., 'Rhodes electric piano', 'analog sub bass', 'vinyl crackle texture', '808 kick drum')"],
  "mood": "A rich, multi-word description of the emotional atmosphere (e.g., 'melancholic yet hopeful', 'energetic and euphoric', 'dark and introspective')"
}

**CRITICAL REQUIREMENTS:**
- Structure sections MUST add up to exactly ${duration} seconds
- Each section description MUST be at least 2 full sentences (minimum 30 words)
- Instrument list MUST have at least 8 items
- Title MUST be creative and evocative, not generic
- Mood MUST be nuanced with multiple descriptors
- Think like a professional producer creating a detailed session plan

BE CREATIVE, DETAILED, AND PROFESSIONAL. This plan will be used to generate actual music, so make it comprehensive and inspiring!`;

    try {
      const result = await model.generateContent(promptText);
      const response = result.response;
      const text = response.text();

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const plan = JSON.parse(jsonMatch[0]) as MusicPlan;

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
    } catch (error) {
      logger.error({ error }, 'Failed to generate plan with Gemini');
      return this.generateMockPlan(prompt, duration, genres, artistInspiration);
    }
  }

  private generateMockPlan(prompt: string, duration: number, genres?: string[], artistInspiration?: string[]): MusicPlan {
    const genre = genres?.[0] || 'Electronic';
    const bpmMap: Record<string, number> = {
      lofi: 82,
      'lo-fi': 82,
      'hip-hop': 95,
      'hip hop': 95,
      techno: 128,
      house: 124,
      garage: 134,
      dnb: 174,
      'drum and bass': 174,
      'drum & bass': 174,
      ambient: 85,
      downtempo: 88,
      trance: 138,
      dubstep: 140,
      trap: 145,
      pop: 120,
      rock: 125,
      indie: 115,
      jazz: 110,
      electronic: 120,
    };
    
    const lowerGenre = genre.toLowerCase();
    let bpm = 120;
    for (const [key, value] of Object.entries(bpmMap)) {
      if (lowerGenre.includes(key)) {
        bpm = value;
        break;
      }
    }
    
    // Add slight variation to BPM for organic feel
    bpm = bpm + Math.floor(Math.random() * 6) - 3;
    
    const keys = ["A minor", "C minor", "D minor", "E minor", "G minor", "F minor", "B minor", 
                  "C Major", "G Major", "D Major", "F Major", "A Major"];
    const key = keys[Math.floor(Math.random() * keys.length)];

    // Generate more detailed title
    const titlePrefixes = ['Journey Through', 'Echoes of', 'Dreams in', 'Waves of', 'Midnight', 'Urban', 'Lost in', 'Memories of'];
    const titlePrefix = titlePrefixes[Math.floor(Math.random() * titlePrefixes.length)];
    const promptWords = prompt.split(' ').filter(w => w.length > 3).slice(0, 3);
    const title = promptWords.length > 0 
      ? `${titlePrefix} ${promptWords.join(' ')}`
      : `${titlePrefix} Sound`;

    // Create detailed structure based on duration
    const sections: Array<{section: string; duration: number; description: string}> = [];
    
    if (duration <= 45) {
      // Short track: Intro → Main → Outro
      sections.push({
        section: 'Intro',
        duration: Math.floor(duration * 0.25),
        description: `Opening with atmospheric elements and subtle rhythmic foundation. Slowly building tension through layered textures and filtered sounds. The ${genre} aesthetic emerges through carefully chosen timbres and production techniques, establishing the mood and sonic palette for the journey ahead.`
      });
      sections.push({
        section: 'Main Section',
        duration: Math.floor(duration * 0.55),
        description: `Full arrangement comes into play with all core elements established. The groove locks in with driving drums, melodic hooks weave through the mix, and the bassline provides solid foundation. This section showcases the track's main thematic material with dynamic variations and subtle production flourishes that keep the listener engaged throughout.`
      });
      sections.push({
        section: 'Outro',
        duration: duration - sections.reduce((sum, s) => sum + s.duration, 0),
        description: `Gradual wind-down maintaining the emotional core while stripping away elements. Reverb tails extend into space, drums simplify, and melodic fragments echo as the track gently fades. The outro provides resolution while leaving a lasting impression of the sonic journey.`
      });
    } else if (duration <= 90) {
      // Medium track: Intro → Verse → Chorus → Bridge → Outro
      sections.push({
        section: 'Intro',
        duration: Math.floor(duration * 0.15),
        description: `Atmospheric opening establishing key, tempo, and timbral identity. Subtle rhythmic elements hint at the groove to come, while pads or ambient textures create anticipation. Production effects like filters, reverb automation, and layered synthesis build intrigue and set the ${genre} aesthetic from the first moment.`
      });
      sections.push({
        section: 'Verse',
        duration: Math.floor(duration * 0.25),
        description: `Core rhythmic foundation solidifies with full drum arrangement. Melodic motifs introduce the track's harmonic vocabulary over a grooving bassline. Instrumentation is carefully balanced to create space and movement, with production techniques enhancing the genre's characteristic sound - whether that's lo-fi texture, precise techno elements, or genre-specific ear candy.`
      });
      sections.push({
        section: 'Chorus',
        duration: Math.floor(duration * 0.30),
        description: `Peak energy section where all elements converge in a cohesive, impactful arrangement. Additional layers, harmonic richness, and production intensity elevate the emotional stakes. The hook crystallizes here with memorable melodic phrases and full sonic spectrum engagement. Dynamic contrast from the verse creates satisfying payoff for the listener.`
      });
      sections.push({
        section: 'Bridge',
        duration: Math.floor(duration * 0.15),
        description: `Transitional passage offering fresh perspective through altered arrangement or harmonic movement. Perhaps a breakdown to minimal elements, key change, or introduction of new textural ideas. This section provides breathing room and narrative development before the final resolution, maintaining interest through contrast and surprise.`
      });
      sections.push({
        section: 'Outro',
        duration: duration - sections.reduce((sum, s) => sum + s.duration, 0),
        description: `Elegant conclusion that honors the journey while providing satisfying closure. Elements gradually fade or strip away, leaving signature sounds or melodic fragments to linger in memory. Reverb, delay, and spatial effects extend into silence, creating a thoughtful ending that respects both the track's energy and the listener's emotional investment.`
      });
    } else {
      // Long track: Extended structure with builds and drops
      sections.push({
        section: 'Intro',
        duration: Math.floor(duration * 0.12),
        description: `Extended atmospheric introduction that takes time to develop the sonic world. Layered textures unfold gradually, rhythm hints emerge and recede, and timbral exploration establishes the production aesthetic. This patient opening rewards attentive listening while building anticipation for the rhythmic engagement to come.`
      });
      sections.push({
        section: 'Build-up',
        duration: Math.floor(duration * 0.10),
        description: `Rising tension through rhythmic acceleration, filter sweeps, and increasing layer density. Percussion elements accumulate, melodic fragments repeat with growing intensity, and production techniques like risers, white noise builds, and automation curves create irresistible momentum toward the drop. Energy compounds with each passing bar.`
      });
      sections.push({
        section: 'Drop / Main Section A',
        duration: Math.floor(duration * 0.22),
        description: `Explosive release of built tension with full arrangement impact. Kick drum locks, bass dominates the low end, and melodic elements shine with clarity and purpose. The groove establishes itself with authority while production polish ensures every element sits perfectly in the mix. This section delivers on the promise of the build-up with satisfying power.`
      });
      sections.push({
        section: 'Breakdown',
        duration: Math.floor(duration * 0.12),
        description: `Dramatic reduction to create space and dynamic contrast. Stripped-back arrangement focuses on key melodic or atmospheric elements, allowing breathing room in the narrative. Perhaps just pads and distant percussion, or a melodic solo moment. This respite makes the return to full energy more impactful and gives the track emotional depth.`
      });
      sections.push({
        section: 'Main Section B',
        duration: Math.floor(duration * 0.24),
        description: `Return to full energy with evolved arrangement and fresh perspective on the thematic material. New production layers, counter-melodies, or rhythmic variations keep the extended duration engaging. The track's core identity remains while details shift and surprise, showcasing production depth and compositional development through subtle but meaningful changes.`
      });
      sections.push({
        section: 'Outro / Wind Down',
        duration: duration - sections.reduce((sum, s) => sum + s.duration, 0),
        description: `Extended conclusion that gradually releases the energy built throughout the track. Elements peel away one by one, creating a descending arc of intensity while maintaining emotional connection. Reverb trails, echo fragments, and ambient remnants linger as the rhythmic foundation dissolves. The ending provides both resolution and contemplative space for reflection on the musical journey.`
      });
    }

    // Generate detailed instrument list based on genre
    const genreInstruments: Record<string, string[]> = {
      lofi: ['Rhodes electric piano with vinyl texture', 'Dusty acoustic kick drum', 'Crispy hi-hat samples', 'Warm analog sub bass', 'Vinyl crackle and tape hiss layer', 'Jazz guitar samples (single notes)', 'Soft synth pad with chorus', 'Tape-saturated snare', 'Atmospheric field recordings', 'Lo-fi texture overlays'],
      techno: ['Analog TR-909 kick drum', 'Industrial hi-hat sequence', 'TB-303 style acid bass', 'Modular synth bleeps and blips', 'Filtered noise sweeps', 'Metallic percussion samples', 'Dark atmospheric pad', 'Resonant analog bass stabs', 'Reverb-drenched clap', 'Automated filter sweeps'],
      house: ['Four-on-the-floor kick', 'Funky disco hi-hats', 'Grooving sub bass', 'Piano stab samples', 'Vocal chop effects', 'Classic organ hits', 'Smooth synth strings', 'Percussion shakers', 'Warm pad atmospheres', 'Filtered chord stabs'],
      ambient: ['Ethereal synth pad layers', 'Granular texture clouds', 'Field recording elements', 'Deep sub bass drone', 'Processed acoustic instruments', 'Shimmer reverb trails', 'Modulated ambient wash', 'Distant melodic fragments', 'Nature sound samples', 'Sparse bell tones'],
      electronic: ['Digital synthesizer lead', 'Electronic drum kit', 'Sub bass with modulation', 'Arpeggiator patterns', 'Pad synthesizer layers', 'Effects-processed vocals', 'Percussion samples', 'Ambient noise textures', 'Filtered chord stabs', 'Glitch effect elements'],
    };

    let instruments = genreInstruments.electronic; // default
    const lowerGenreKey = Object.keys(genreInstruments).find(k => lowerGenre.includes(k));
    if (lowerGenreKey) {
      instruments = genreInstruments[lowerGenreKey];
    }

    // Generate nuanced mood description
    const moodAdjectives = [
      ['melancholic', 'yet hopeful'],
      ['energetic', 'and euphoric'],
      ['dark', 'yet introspective'],
      ['dreamy', 'and nostalgic'],
      ['intense', 'with emotional depth'],
      ['laid-back', 'yet engaging'],
      ['atmospheric', 'and immersive'],
      ['groovy', 'with soulful undertones'],
      ['hypnotic', 'and meditative'],
      ['uplifting', 'with bittersweet moments']
    ];
    const moodPair = moodAdjectives[Math.floor(Math.random() * moodAdjectives.length)];
    const mood = `${moodPair[0]} ${moodPair[1]}`;

    return {
      title,
      genre: `${genre.charAt(0).toUpperCase() + genre.slice(1)}${artistInspiration && artistInspiration.length > 0 ? ` (inspired by ${artistInspiration[0]})` : ''}`,
      bpm,
      key,
      structure: sections,
      instruments,
      mood,
    };
  }
}

export const planService = new PlanService();