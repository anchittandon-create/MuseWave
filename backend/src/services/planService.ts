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

    const promptText = `You are an elite music producer, composer, and sound designer with 20+ years of experience across multiple genres. You've worked with major labels, scored films, and produced chart-topping tracks. Your deep knowledge of music theory, audio engineering, synthesis, mixing, and mastering makes you the perfect guide for creating detailed music production plans.

═══════════════════════════════════════════════════════════════════════════════
                            USER'S CREATIVE VISION
═══════════════════════════════════════════════════════════════════════════════

**Primary Request:** "${prompt}"

**Duration Target:** ${duration} seconds (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})

**Genre Palette:** ${genres && genres.length > 0 ? genres.join(', ') : 'Open to any genre that authentically serves the creative vision'}

**Artistic References:** ${artistInspiration && artistInspiration.length > 0 ? artistInspiration.join(', ') : 'Draw from your vast experience across the musical landscape'}

═══════════════════════════════════════════════════════════════════════════════
                         YOUR COMPREHENSIVE TASK
═══════════════════════════════════════════════════════════════════════════════

You must create a HIGHLY DETAILED, PROFESSIONAL-GRADE music production plan that would be used in an actual studio session. This isn't a simple outline - it's a complete creative blueprint.

**ANALYTICAL DEPTH REQUIRED:**

1. **Emotional & Psychological Analysis** (200+ words)
   - What emotions does the user's prompt evoke?
   - What imagery, memories, or sensations does it conjure?
   - What's the psychological journey you want the listener to experience?
   - How will you translate abstract concepts into sonic elements?
   - What's the intended use case? (study, party, meditation, workout, etc.)

2. **Genre & Style Considerations** (150+ words)
   - What genre(s) best serve this vision and why?
   - What are the canonical examples from this genre?
   - What production techniques define this style?
   - What are the common pitfalls to avoid?
   - How can we put a fresh spin on genre conventions?

3. **Technical Production Philosophy** (150+ words)
   - What's the overall mix philosophy? (spacious, dense, minimal, maximal)
   - What frequency spectrum strategy will you use?
   - How will you handle dynamics and transients?
   - What's the reverb/delay/spatial approach?
   - How will you create depth and dimension?

${genres && genres.length > 0 ? `
═══════════════════════════════════════════════════════════════════════════════
                    GENRE-SPECIFIC PRODUCTION INTELLIGENCE
═══════════════════════════════════════════════════════════════════════════════

**Primary Genre: ${genres[0].toUpperCase()}**

${this.getGenreGuidance(genres[0])}

**Cross-Genre Synthesis:**
${genres.length > 1 ? `You're blending ${genres.join(' + ')}. Consider:
- Which genre provides the rhythmic foundation?
- Which genre influences the melodic/harmonic approach?
- How do you balance competing aesthetic priorities?
- What unique hybrid characteristics can emerge?
- What production techniques bridge these styles?` : 'Focus deeply on authentic ' + genres[0] + ' production while allowing room for creative innovation.'}
` : ''}

${artistInspiration && artistInspiration.length > 0 ? `
═══════════════════════════════════════════════════════════════════════════════
                       ARTIST INSPIRATION DEEP DIVE
═══════════════════════════════════════════════════════════════════════════════

**Referenced Artists/Producers:** ${artistInspiration.join(', ')}

For EACH artist, analyze and incorporate:

1. **Signature Production Techniques**
   - What effects chains do they favor?
   - What mixing approaches define their sound?
   - What synthesis methods do they employ?
   - How do they handle space and reverb?

2. **Sonic Fingerprints**
   - What frequencies do they emphasize?
   - What's their typical compression approach?
   - How do they handle the low end?
   - What's their stereo imaging philosophy?

3. **Compositional DNA**
   - What chord progressions do they gravitate toward?
   - What's their melodic vocabulary?
   - How do they structure their arrangements?
   - What rhythmic signatures appear repeatedly?

4. **Emotional Signature**
   - What mood do they consistently evoke?
   - How do they handle tension and release?
   - What's their approach to dynamics?
   - How do they create their unique emotional impact?

**Synthesis Strategy:**
Don't just copy these artists - distill their essence and blend it with fresh ideas to create something that honors their influence while standing on its own.
` : ''}

═══════════════════════════════════════════════════════════════════════════════
                         MUSICAL ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

**BPM SELECTION** (Critical Decision):

Consider the genre conventions:
- Lofi/Chillhop: 70-90 BPM (laid-back, study-ready groove)
- Hip-hop/Boom Bap: 85-95 BPM (head-nodding, powerful)
- Hip-hop/Trap: 130-150 BPM (half-time feel, modern)
- House (Deep/Tech): 120-125 BPM (deep groove, club-ready)
- House (Progressive/Electro): 126-130 BPM (driving, energetic)
- Techno (Minimal): 125-130 BPM (hypnotic, precise)
- Techno (Peak Time): 130-135 BPM (relentless, industrial)
- Trance: 136-142 BPM (euphoric, building)
- Drum & Bass: 170-180 BPM (fast breaks, intense)
- Dubstep/Halftime: 140-150 BPM (heavy, wobble)
- Ambient/Downtempo: 60-90 BPM (spacious, meditative)
- Pop: 100-130 BPM (varied, accessible)
- Rock/Indie: 90-140 BPM (human feel, dynamic)
- Jazz/Fusion: 80-180 BPM (varied, expressive)

Choose a BPM that serves the EMOTION, not just the genre.

**KEY & HARMONIC FRAMEWORK** (Essential Foundation):

Minor Keys (Melancholic, Introspective, Dark):
- A minor: Natural, versatile, slightly dark
- D minor: The "saddest" key, deeply emotional
- E minor: Open, contemplative, guitar-friendly
- B minor: Rich, complex, emotionally dense
- C minor: Dark, mysterious, powerful
- F minor: Deep melancholy, cinematic
- G minor: Baroque, sophisticated, dramatic

Major Keys (Uplifting, Bright, Energetic):
- C Major: Pure, clear, simple beauty
- G Major: Bright, cheerful, uplifting
- D Major: Triumphant, glorious, fanfare-like
- F Major: Pastoral, peaceful, natural
- A Major: Warm, rich, romantic
- Eb Major: Majestic, grand, expansive

Modal Approaches (Sophisticated, Jazzy, Unique):
- Dorian: Minor with raised 6th (jazzy, sophisticated)
- Mixolydian: Major with flat 7th (rock, blues feel)
- Phrygian: Dark, Spanish, exotic
- Lydian: Dreamy, floating, ethereal

Choose based on the emotional target and genre conventions.

**CHORD PROGRESSION STRATEGY:**

Don't just pick a key - design a progression that tells a story:
- Classic minor: i - VI - III - VII (melancholic, hip-hop, lofi)
- Epic progression: vi - IV - I - V (powerful, emotional)
- Jazz influence: ii - V - I (sophisticated, resolving)
- Modal approach: Use borrowed chords for color
- Tension builders: Sus chords, 7ths, 9ths, 11ths
- Modern production: Consider pedal tones, drones, static harmony

═══════════════════════════════════════════════════════════════════════════════
                    DETAILED SECTION-BY-SECTION BLUEPRINT
═══════════════════════════════════════════════════════════════════════════════

You MUST create ${duration <= 45 ? '3-4' : duration <= 90 ? '4-6' : '6-8'} distinct sections that add up to EXACTLY ${duration} seconds.

**STRUCTURE GUIDELINES BY DURATION:**

${duration <= 45 ? `
**SHORT FORM (${duration}s):**
Suggested: Intro (20-25%) → Main/Development (50-60%) → Outro (20-25%)
Focus on immediate impact and concise storytelling.
` : duration <= 90 ? `
**MEDIUM FORM (${duration}s):**
Suggested: Intro (12-15%) → Verse/Build (20-25%) → Chorus/Peak (25-30%) → Bridge/Breakdown (15-20%) → Outro (12-15%)
Classic song structure with clear emotional arc.
` : `
**EXTENDED FORM (${duration}s):**
Suggested: Intro (10-12%) → Build-up (8-10%) → Drop/Peak A (18-22%) → Breakdown (10-12%) → Build 2 (8-10%) → Peak B (20-24%) → Outro (10-15%)
Epic journey with multiple peaks and valleys.
`}

**FOR EACH SECTION, YOU MUST PROVIDE:**

1. **Section Name** (Creative, descriptive - not just "Section 1")
   Examples: "Ethereal Awakening", "Rhythmic Ascension", "Melodic Catharsis", "Hypnotic Descent"

2. **Exact Duration in Seconds** (Must add up to ${duration}s total)

3. **COMPREHENSIVE Description** (Minimum 80-120 words per section):
   
   **What to include in EVERY section description:**
   
   a) **Sonic Elements Introduced:**
      - Which instruments enter/exit?
      - What frequency ranges are emphasized?
      - What's the density/complexity level?
   
   b) **Production Techniques:**
      - Filter movements (HP/LP sweeps, resonance)
      - Reverb approach (size, pre-delay, decay)
      - Delay types (ping-pong, slapback, tape)
      - Compression character (parallel, sidechain, glue)
      - Spatial effects (stereo width, panning)
      - Modulation (chorus, phaser, flanger)
      - Saturation/distortion (tape, tube, digital)
   
   c) **Melodic/Harmonic Content:**
      - What's the chord progression?
      - What melodic motifs are present?
      - What's the harmonic rhythm?
      - Any key changes or modal shifts?
   
   d) **Rhythmic Characteristics:**
      - What's the drum pattern complexity?
      - Straight vs swing feel?
      - Syncopation level?
      - Percussion density?
   
   e) **Emotional Arc:**
      - What emotion is this section evoking?
      - Is tension building or releasing?
      - What's the energy level (1-10)?
      - How does it connect to adjacent sections?
   
   f) **Mix Philosophy:**
      - What's foregrounded vs background?
      - Mono vs stereo elements?
      - Dry vs wet signal ratio?
      - Dynamic range approach?
   
   g) **Reference Points:**
      - What does this remind you of? (if applicable)
      - What production tricks are borrowed from where?

**CRITICAL:** Each section description should be substantial enough that a producer could start working immediately with a clear vision.

═══════════════════════════════════════════════════════════════════════════════
                      INSTRUMENTATION & SOUND DESIGN
═══════════════════════════════════════════════════════════════════════════════

You MUST specify **10-15 distinct instruments/sound sources**, each with detailed characteristics:

**FORMAT FOR EACH INSTRUMENT:**
Not just "piano" but "Vintage Rhodes Mark II electric piano with subtle tremolo and tape saturation"
Not just "bass" but "Analog Moog sub bass with subtle filter movement and slight distortion for warmth"

**CATEGORIES TO COVER:**

1. **Rhythmic Foundation** (3-4 elements)
   - Kick drum (character, tuning, processing)
   - Snare/clap (type, reverb, layering)
   - Hi-hats (open/closed, pattern complexity)
   - Percussion (shakers, tambourine, clicks, etc.)

2. **Harmonic/Melodic Elements** (4-6 elements)
   - Lead sounds (synthesis type, character)
   - Chord instruments (piano, guitar, pads)
   - Bass (sub, mid-bass, bass melody)
   - Arpeggiators or sequence-based elements

3. **Atmospheric/Textural** (3-4 elements)
   - Pad sounds (reverb, movement, width)
   - Ambient textures (granular, field recordings)
   - FX sounds (risers, impacts, sweeps)
   - Background elements (vinyl crackle, noise, etc.)

4. **Special Elements** (1-2 unique items)
   - Genre-specific signatures
   - Experimental sound design
   - Unique sampling or processing

**PRODUCTION DETAILS TO INCLUDE:**
- Synthesis type (analog, digital, wavetable, FM, granular)
- Processing chain (reverb type, compression, saturation)
- Frequency range emphasis
- Stereo positioning
- Dynamic role (constant vs intermittent)

═══════════════════════════════════════════════════════════════════════════════
                         MOOD & ATMOSPHERE
═══════════════════════════════════════════════════════════════════════════════

Create a **rich, multi-dimensional mood description** (40-60 words):

**Don't just say:** "dark"
**Instead say:** "brooding and introspective with undercurrents of hope, like watching a storm roll in at dusk - simultaneously threatening and beautiful, creating space for contemplation while maintaining forward momentum"

**Don't just say:** "energetic"
**Instead say:** "explosively euphoric with relentless forward drive, capturing the peak moment of collective joy on a dancefloor at 3am when time stops and pure kinetic energy takes over - infectious, uplifting, transcendent"

**Consider these dimensions:**
- Valence: Positive ←→ Negative
- Energy: Low ←→ High
- Density: Sparse ←→ Dense
- Warmth: Cold ←→ Warm
- Movement: Static ←→ Dynamic
- Space: Intimate ←→ Expansive
- Time: Timeless ←→ Contemporary
- Texture: Smooth ←→ Rough

═══════════════════════════════════════════════════════════════════════════════
                          TITLE CREATION
═══════════════════════════════════════════════════════════════════════════════

Create a **memorable, evocative title** (3-8 words) that:
- Captures the essence of the track
- Sounds like it could be real song title
- Avoids generic phrases like "Beat #1" or "Untitled Track"
- Has poetic or emotional resonance
- Fits the genre aesthetic

**Great examples:**
- Lofi: "Rainy Tuesday Study Session", "Midnight Coffee Contemplation"
- Techno: "Industrial Prayer", "Steel Cathedral at Dawn"
- Ambient: "Dissolving Into Everything", "Between Waking and Sleep"
- House: "3AM Warehouse Memories", "Lost in the Groove"

═══════════════════════════════════════════════════════════════════════════════
                           OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Return **ONLY** a valid JSON object (no markdown code fences, no explanation text, no preamble):

{
  "title": "Your evocative 3-8 word title here",
  "genre": "Primary genre with subgenre specificity (e.g., 'Dark Progressive Techno', 'Jazz-Influenced Lofi Hip-Hop', 'Cinematic Ambient Electronica')",
  "bpm": <integer between 60-180>,
  "key": "Musical key with scale/mode (e.g., 'A minor', 'F# Dorian', 'Eb Lydian', 'C Major')",
  "structure": [
    {
      "section": "Descriptive section name (not generic)",
      "duration": <exact seconds>,
      "description": "COMPREHENSIVE 80-120+ word description covering: sonic elements, production techniques, melodic/harmonic content, rhythmic characteristics, emotional arc, mix philosophy, and how it connects to adjacent sections. Include specific details about filters, reverb, compression, instrumentation changes, chord progressions, and the narrative journey."
    }
  ],
  "instruments": [
    "Detailed instrument 1 with synthesis type and processing (e.g., 'Vintage Fender Rhodes with tape saturation and stereo chorus')",
    "Detailed instrument 2 with character description",
    "...continue for 10-15 total instruments, covering rhythm, harmony, melody, atmosphere, and special elements"
  ],
  "mood": "Rich 40-60 word multi-dimensional atmospheric description that paints a vivid emotional and sensory picture, going far beyond simple adjectives to capture the complete feeling and psychology of the listening experience"
}

═══════════════════════════════════════════════════════════════════════════════
                        CRITICAL QUALITY STANDARDS
═══════════════════════════════════════════════════════════════════════════════

**MANDATORY REQUIREMENTS - YOUR RESPONSE WILL BE REJECTED IF:**
- ❌ Structure sections don't add up to exactly ${duration} seconds
- ❌ Any section description is less than 80 words
- ❌ Fewer than 10 instruments specified
- ❌ Instruments lack specific details (just "piano" not acceptable)
- ❌ Title is generic or uninspired
- ❌ Mood description is less than 40 words
- ❌ Genre lacks subgenre specificity
- ❌ Section descriptions don't mention production techniques
- ❌ No mention of emotional arc or narrative flow
- ❌ JSON is malformed or includes markdown formatting

**EXCELLENCE INDICATORS - STRIVE FOR:**
- ✅ Section descriptions 100-150+ words each
- ✅ 12-15 highly specific instruments
- ✅ Production terminology that shows expertise
- ✅ Clear narrative arc across sections
- ✅ Genre-authentic details
- ✅ Creative, memorable title
- ✅ Mood description that's literary in quality
- ✅ Unique insights that surprise and inspire

═══════════════════════════════════════════════════════════════════════════════
                           FINAL DIRECTIVE
═══════════════════════════════════════════════════════════════════════════════

You're not just filling out a form - you're creating a COMPREHENSIVE PRODUCTION BLUEPRINT that will guide the actual creation of music. A producer should be able to take your plan and start working immediately with absolute clarity about what to create.

Think of this as the detailed creative brief you'd receive for a high-budget production. Every word should add value. Every detail should inform decisions. This is professional-grade work.

Your experience, expertise, and creative vision should shine through every section.

Now create something extraordinary.`;


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