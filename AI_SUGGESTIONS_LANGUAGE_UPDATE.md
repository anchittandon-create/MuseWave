# AI Suggestions Language Context Update

## Changes Made

Updated AI suggestion system to make **Artists** and **Lyrics** suggestions contextually aware of **selected languages**, along with genres, prompt, and duration.

## What Was Updated

### 1. Artist Suggestions (`suggestArtists`)

**Now considers:**
- ✅ **Languages** (primary factor for artist suggestions)
- ✅ **Genres** (secondary factor)
- ✅ **Prompt** (tertiary factor)
- ✅ **Duration** (passed for context)

**Language-based artist mapping added:**
```typescript
Spanish → Bad Bunny, Rosalía, J Balvin, Karol G, Rauw Alejandro
French → Aya Nakamura, Stromae, Christine and the Queens, Angèle, PNL
Hindi → A.R. Rahman, Arijit Singh, Shreya Ghoshal, Nucleya, Ritviz
Portuguese → Anitta, Pabllo Vittar, Alok, Vintage Culture
Korean → BTS, BLACKPINK, Peggy Gou, epik high, PSY
Japanese → Hikaru Utada, Ken Ishii, Yasutaka Nakata, Nujabes
Arabic → Amr Diab, Nancy Ajram, Cairokee, Mashrou Leila
German → Paul Kalkbrenner, Robin Schulz, Fritz Kalkbrenner
Italian → Mahmood, Piero Pelù, Tale of Us, Anyma
Mandarin → Jay Chou, Jolin Tsai, Lexie Liu, Higher Brothers
Tamil → A.R. Rahman, Anirudh Ravichander, Santhosh Narayanan
Telugu → Devi Sri Prasad, Thaman S, S. Thaman
```

**Priority order:**
1. Artists matching selected languages (highest)
2. Artists matching selected genres
3. Random diverse artists

### 2. Lyrics Suggestions (`enhanceLyrics`)

**Now considers:**
- ✅ **Languages** (target language for lyrics)
- ✅ **Genres** (style and theme)
- ✅ **Prompt** (content inspiration)
- ✅ **Duration** (structure: short/medium/long)
- ✅ **Artists** (stylistic inspiration)

**Duration-based structure:**
- **< 90s:** Verse + Chorus (concise)
- **90-180s:** Verse + Chorus + Verse + Chorus (standard)
- **180s+:** Verse + Chorus + Verse + Chorus + Bridge + Final Chorus (full)

**Genre-specific lyrical themes:**
```typescript
Techno → Technology, future, rhythm, mechanical, pulse
House → Dancing, nightlife, freedom, energy, unity
Ambient → Peace, nature, meditation, space, time
Dubstep → Power, bass, intensity, drop, energy
Trap → Hustle, success, struggle, street, ambition
```

### 3. API Endpoint Updates

**`/api/suggest-artists`:**
- Already had language support ✓
- Enhanced scoring algorithm to prioritize language matches

**`/api/enhance-lyrics`:**
- Added `genres` (array), `duration`, and `artists` to context
- Updated Gemini prompt to include all contextual factors
- Duration-based structure guidance added
- Artist inspiration included in prompt

## Context Flow

The AI suggestions now follow this contextual progression:

```
1. User enters PROMPT
   ↓
2. AI suggests GENRES (based on prompt)
   ↓
3. User selects LANGUAGES
   ↓
4. AI suggests ARTISTS (based on LANGUAGES + GENRES + PROMPT)
   ↓
5. AI suggests LYRICS (based on ALL: LANGUAGES + GENRES + PROMPT + DURATION + ARTISTS)
```

## Example Behavior

### Example 1: Bollywood-style Track
```javascript
Input:
  prompt: "Epic Bollywood romance"
  genres: ["Bollywood", "Classical Fusion"]
  languages: ["Hindi", "Punjabi"]
  duration: 240

Artists Suggested:
  → A.R. Rahman, Arijit Singh, Shreya Ghoshal, Ritviz
  (Prioritized Hindi/Punjabi artists)

Lyrics Generated:
  → In Hindi
  → Full structure (240s = long)
  → Bollywood romance theme
  → Inspired by A.R. Rahman's style
```

### Example 2: Latin House Track
```javascript
Input:
  prompt: "Summer party vibes"
  genres: ["House", "Latin"]
  languages: ["Spanish", "Portuguese"]
  duration: 150

Artists Suggested:
  → Bad Bunny, Alok, J Balvin, Vintage Culture
  (Spanish/Portuguese artists in house/Latin genres)

Lyrics Generated:
  → In Spanish
  → Standard structure (150s = medium)
  → Summer party theme with house energy
  → Latin house style
```

### Example 3: Korean Electronic
```javascript
Input:
  prompt: "Futuristic K-pop electronic"
  genres: ["Electronic", "K-Pop"]
  languages: ["Korean"]
  duration: 180

Artists Suggested:
  → BTS, BLACKPINK, Peggy Gou, epik high
  (Korean artists matching electronic/K-pop)

Lyrics Generated:
  → In Korean
  → Full structure (180s)
  → Futuristic K-pop theme
  → Electronic production style
```

## Technical Details

### Files Modified

1. **`services/geminiService.ts`**
   - `buildArtistFallback()`: Added language-based artist mapping (priority 1)
   - `buildLyricsFallback()`: Added genre templates, duration-based structure
   - Context passing includes: languages, genres, duration, artists

2. **`api/enhance-lyrics.ts`**
   - Interface updated with `genres[]`, `duration`, `artists[]`
   - Gemini prompt includes all contextual factors
   - Duration-based structure guidance
   - Artist inspiration in prompt

### Fallback Behavior

If Gemini API is unavailable:
- **Artists:** Uses local language + genre mapping
- **Lyrics:** Uses genre templates with language note
  - Non-English: Shows note to use Gemini for proper translation
  - English: Generates genre-appropriate lyrics with duration-based structure

## Testing

### Test Language-based Artists
```typescript
const context = {
  prompt: "Romantic ballad",
  genres: ["Pop"],
  languages: ["Spanish"],
  duration: 180
};
const result = await geminiService.suggestArtists(context);
// Expected: Bad Bunny, Rosalía, J Balvin, etc.
```

### Test Duration-based Lyrics
```typescript
const contextShort = {
  prompt: "Quick drop",
  genres: ["Dubstep"],
  languages: ["English"],
  duration: 60,
  artists: ["Skrillex"]
};
const result = await geminiService.enhanceLyrics(contextShort);
// Expected: Short structure (Verse + Chorus)
```

## Benefits

1. **More Relevant Artist Suggestions**
   - Artists match the user's language preference
   - Cultural context is preserved
   - Better inspiration for international music

2. **Better Structured Lyrics**
   - Duration-appropriate length
   - Genre-specific themes and language
   - Artist-inspired style
   - Language-appropriate content

3. **Enhanced User Experience**
   - Suggestions feel more intelligent
   - Context flows naturally
   - Less manual editing needed

## Migration Notes

- **No breaking changes** - All fields are optional with fallbacks
- **Backward compatible** - Handles both old and new context formats
- **Progressive enhancement** - More context = better suggestions

## Future Enhancements

Potential improvements:
- [ ] Multi-language lyrics (mixing languages in one track)
- [ ] Regional dialect variations (e.g., Mexican Spanish vs. Spain Spanish)
- [ ] Cultural event themes (Diwali, Carnival, Lunar New Year)
- [ ] Collaboration suggestions (artist pairings)
- [ ] Mood-based language intensity (energetic vs. calm word choices)

---

**Status:** ✅ Implemented and ready for testing
**Date:** Nov 9, 2025
**Impact:** High - Significantly improves AI suggestion relevance
