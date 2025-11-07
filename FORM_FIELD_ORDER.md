# Form Field Order & Contextual AI Suggestions

## Overview

This document describes the intentional ordering of form fields in MuseWave to ensure each AI suggestion considers all previous user inputs for maximum relevance and accuracy.

---

## Field Ordering (Top to Bottom)

### 1. **Music Prompt**
**Purpose**: The primary creative direction for the track.

**AI Enhancement**: Enhances the user's basic idea into a rich, detailed description.

**Context Used**: 
- None (first field)

**Output**: Detailed track description

---

### 2. **Genres**
**Purpose**: Musical genres to guide the style.

**AI Suggestion**: Suggests genres that match the prompt.

**Context Used**:
- ✅ Music Prompt

**Output**: 3-5 genre tags

---

### 3. **Duration**
**Purpose**: Track length specification.

**AI Enhancement**: None (user-controlled slider)

**Context Used**: N/A

**Output**: Time in HH:MM:SS format

---

### 4. **Preferred Vocal Languages** ⭐ (Moved Before Artists)
**Purpose**: Vocal languages that complement the musical style.

**AI Suggestion**: Suggests languages based on genre aesthetics, cultural associations, and mood.

**Context Used**:
- ✅ Music Prompt
- ✅ Genres
- ✅ Duration

**Output**: 3-4 language tags

**Why This Order?**
Languages should come BEFORE artists because:
1. Language/region influences which artists are most relevant
2. Genre + language narrows the artist pool significantly
3. Cultural context is established before selecting inspirations

---

### 5. **Artist Inspiration** ⭐ (Moved After Languages)
**Purpose**: Guide AI with specific artist styles.

**AI Suggestion**: Suggests artists considering ALL previous inputs.

**Context Used**:
- ✅ Music Prompt
- ✅ Genres
- ✅ Duration
- ✅ **Languages** (NEW - high priority scoring)

**Output**: 3-5 artist names

**Improved Logic**:
```typescript
// Language-based artist scoring (highest priority)
if (languages.includes('hindi')) {
  suggest: ['Nucleya', 'Ritviz', 'KSHMR'] // +3 score bonus
}
if (languages.includes('spanish')) {
  suggest: ['Alok', 'J Balvin', 'Vintage Culture'] // +3 score bonus
}
if (languages.includes('korean')) {
  suggest: ['Teddy Park', 'Black Eyed Pilseung'] // +3 score bonus
}
```

**Why This Order?**
Artists now benefit from knowing:
1. The musical style (prompt + genres)
2. The cultural/linguistic context (languages)
3. Can suggest region-specific producers and artists

---

### 6. **Lyrics / Vocal Theme**
**Purpose**: Lyrical content or vocal melody theme.

**AI Enhancement**: Generates or enhances lyrics based on all previous context.

**Context Used**:
- ✅ Music Prompt
- ✅ Genres
- ✅ Languages (for language-appropriate lyrics)
- ✅ Artist Inspiration (for stylistic guidance)

**Output**: Multi-verse lyrics or vocal theme

**Why Last?**
Lyrics benefit most from complete context:
1. Musical style is defined (prompt + genres)
2. Language is selected (knows which language to write in)
3. Artist style is known (can emulate vocal patterns)
4. Can create cohesive, contextually relevant lyrics

---

## Data Flow Example

### User Journey:
```
1. PROMPT: "Epic cinematic score for a space battle"
   ↓
2. GENRES: AI suggests → [Orchestral, Epic, Cinematic]
   ↓ (considers prompt)
3. LANGUAGES: AI suggests → [English, Latin, Japanese]
   ↓ (considers prompt + genres)
4. ARTISTS: AI suggests → [Hans Zimmer, Two Steps from Hell, Hiroyuki Sawano]
   ↓ (considers prompt + genres + languages)
5. LYRICS: AI generates → "Through the void we rise..."
   ↓ (considers ALL previous fields)
```

### Context Accumulation:
```
Field 1: [prompt]
Field 2: [prompt, genres]
Field 3: [prompt, genres, duration]
Field 4: [prompt, genres, duration, languages]  ← NOW includes languages
Field 5: [prompt, genres, duration, languages, artists]  ← Artists benefit from languages
Field 6: [ALL ABOVE + artists]
```

---

## Technical Implementation

### Frontend Changes
**File**: `components/MuseForgeForm.tsx`

**Changes**:
1. ✅ Moved "Preferred Vocal Languages" section BEFORE "Artist Inspiration"
2. ✅ Updated artist description to mention language consideration:
   ```tsx
   "Guide the AI with artists whose style you admire. 
    The AI will consider your selected genres and languages when suggesting artists."
   ```

### Backend Changes
**File**: `api/suggest-artists.ts`

**Changes**:
1. ✅ Added `languages?: string[]` to context interface
2. ✅ Updated Gemini prompt to include languages:
   ```typescript
   Languages: ${context.languages?.join(', ') || 'Not specified'}
   ```
3. ✅ Added language-based scoring in fallback logic:
   ```typescript
   // High priority: +3 score for language matches
   if (languages.includes('hindi')) {
     if (indianArtists.includes(artist)) score += 3;
   }
   ```
4. ✅ Expanded artist pool with regional artists:
   - Indian: Nucleya, Ritviz, KSHMR, Lost Stories
   - Latin: Alok, Vintage Culture, J Balvin
   - K-Pop: Teddy Park, Black Eyed Pilseung
   - Japanese: Cornelius, Ken Ishii, Susumu Yokota

---

## Benefits of This Ordering

### 1. **More Relevant Artist Suggestions**
- Hindi languages → Suggests Nucleya, Ritviz automatically
- Spanish languages → Suggests Alok, J Balvin
- Avoids suggesting Western EDM artists for Bollywood tracks

### 2. **Culturally Appropriate Combinations**
- K-Pop genre + Korean language → K-Pop producers
- Reggaeton genre + Spanish language → Latin producers
- Ambient genre + Japanese language → Japanese electronica artists

### 3. **Better User Experience**
- Users don't get irrelevant artists after selecting languages
- Suggestions feel "smarter" and more contextual
- Reduces manual artist entry

### 4. **Cascading Intelligence**
Each field becomes progressively more intelligent:
```
Prompt (baseline) 
  → Genres (genre-aware)
    → Languages (genre + culture aware)
      → Artists (genre + culture + region aware)
        → Lyrics (fully contextual)
```

---

## Testing Scenarios

### Scenario 1: Bollywood Track
```
Input:
- Prompt: "Energetic Bollywood dance track"
- Genres: [Bollywood, Dance, Pop]
- Languages: [Hindi, Punjabi]

Expected Artist Suggestions:
✅ Nucleya, Ritviz, KSHMR (high scores due to Hindi/Punjabi)
❌ Skrillex, Porter Robinson (low scores, Western-focused)
```

### Scenario 2: Latin House
```
Input:
- Prompt: "Tropical house with Latin flavor"
- Genres: [House, Latin, Tropical]
- Languages: [Spanish, Portuguese]

Expected Artist Suggestions:
✅ Alok, Vintage Culture, J Balvin
❌ Deadmau5, Carl Cox (not Latin-focused)
```

### Scenario 3: K-Pop Electronic
```
Input:
- Prompt: "K-Pop inspired electronic track"
- Genres: [K-Pop, Electronic, Dance]
- Languages: [Korean]

Expected Artist Suggestions:
✅ Teddy Park, Black Eyed Pilseung, Zedd
❌ Aphex Twin, Burial (not K-Pop related)
```

---

## Future Enhancements

### 1. **Lyrics Language Auto-Detection**
When languages are selected, pre-populate lyrics field with appropriate language:
```typescript
if (languages.includes('hindi')) {
  placeholder: "पहला छंद:\n..."
}
```

### 2. **Genre + Language Validation**
Warn users about unusual combinations:
```typescript
if (genres.includes('Bollywood') && !languages.includes('Hindi')) {
  toast('Consider adding Hindi for authentic Bollywood sound')
}
```

### 3. **Artist Clustering**
Group suggested artists by region/language:
```
Indian Artists: Nucleya, Ritviz
Latin Artists: Alok, J Balvin
Western Artists: Skrillex, Porter Robinson
```

---

## Summary

✅ **Languages now come BEFORE artists** in the form
✅ **Artist suggestions consider languages** with high-priority scoring
✅ **Regional artist pool expanded** (Indian, Latin, K-Pop, Japanese)
✅ **Culturally appropriate suggestions** based on language selection
✅ **Each field considers ALL previous inputs** for maximum relevance

This ordering ensures that AI suggestions become progressively more intelligent and contextually aware as users fill out the form, leading to better creative results and a superior user experience.
