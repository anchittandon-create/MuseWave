#!/usr/bin/env python3
"""
AI-powered suggestion engine using sentence transformers
Generates context-aware suggestions for genres, artists, and languages
"""

import sys
import json
from sentence_transformers import SentenceTransformer, util
import torch

# Initialize model (cached after first load)
model = None

def load_model():
    global model
    if model is None:
        model = SentenceTransformer('paraphrase-MiniLM-L6-v2')
    return model

def suggest_genres(input_text, context):
    """Generate genre suggestions based on context"""
    model = load_model()
    
    # Build context from musicPrompt, existing genres, and artists
    context_parts = []
    if context.get('musicPrompt'):
        context_parts.append(context['musicPrompt'])
    if context.get('genres'):
        context_parts.append(' '.join(context['genres']))
    if context.get('artistInspiration'):
        context_parts.append(' '.join(context['artistInspiration']))
    
    context_text = ' '.join(context_parts) + ' ' + input_text
    
    # Genre candidates (derived from ontology but AI-selected)
    candidates = [
        "Cinematic", "Electronic", "Ambient", "Techno", "House", "EDM",
        "Synthwave", "Trance", "Drum and Bass", "Dubstep", "Trap",
        "Hip Hop", "Lofi", "Boom Bap", "Jazz", "Blues", "Rock",
        "Alternative", "Indie", "Pop", "K-Pop", "Latin", "Reggaeton",
        "Classical", "Orchestral", "Soundtrack", "Dark Ambient",
        "Industrial", "Post Rock", "Shoegaze", "Dream Pop",
        "Cinematic Electronic", "Hybrid Orchestral", "Epic Cinematic",
        "Ambient Techno", "Deep House", "Progressive House",
        "Melodic Techno", "Minimal Techno", "Acid Techno",
        "Future Bass", "Chillwave", "Vaporwave", "Phonk"
    ]
    
    # Filter candidates that contain input text (case insensitive)
    filtered = [c for c in candidates if input_text.lower() in c.lower()]
    
    # If no prefix match, use semantic similarity
    if not filtered:
        filtered = candidates
    
    # Compute embeddings
    context_embedding = model.encode(context_text, convert_to_tensor=True)
    candidate_embeddings = model.encode(filtered, convert_to_tensor=True)
    
    # Calculate cosine similarity
    scores = util.cos_sim(context_embedding, candidate_embeddings)[0]
    
    # Get top 5 unique suggestions
    top_indices = scores.argsort(descending=True)[:8]
    suggestions = []
    seen = set(context.get('genres', []))
    
    for idx in top_indices:
        candidate = filtered[idx.item()]
        if candidate not in seen and candidate not in suggestions:
            suggestions.append(candidate)
        if len(suggestions) >= 5:
            break
    
    return suggestions

def suggest_artists(input_text, context):
    """Generate artist suggestions based on context"""
    model = load_model()
    
    # Check if language is Hindi or regional (disable suggestions)
    languages = context.get('vocalLanguages', [])
    if any(lang in ['Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Punjabi'] for lang in languages):
        return []
    
    # Build context
    context_parts = []
    if context.get('musicPrompt'):
        context_parts.append(context['musicPrompt'])
    if context.get('genres'):
        context_parts.append(' '.join(context['genres']))
    
    context_text = ' '.join(context_parts) + ' ' + input_text
    
    # Artist candidates (genre-agnostic, AI will select based on context)
    candidates = [
        # Electronic
        "Daft Punk", "Tycho", "BT", "Aphex Twin", "Fred again..", "Bonobo",
        "Four Tet", "Burial", "Jon Hopkins", "Ólafur Arnalds", "Nils Frahm",
        "Röyksopp", "Moderat", "Caribou", "Jamie xx", "Disclosure",
        # Cinematic
        "Hans Zimmer", "Junkie XL", "Hybrid", "Two Steps From Hell",
        "Thomas Bergersen", "Audiomachine", "Really Slow Motion",
        "Brian Eno", "Max Richter", "Ludovico Einaudi", "Clint Mansell",
        # Hip Hop / Lofi
        "J Dilla", "Nujabes", "Idealism", "Jinsang", "SwuM", "Tomppabeats",
        "Kendrick Lamar", "Travis Scott", "Metro Boomin", "21 Savage",
        # Techno / House
        "Carl Cox", "Adam Beyer", "Nina Kraviz", "Amelie Lens", "Charlotte de Witte",
        "Tale Of Us", "Solomun", "Dixon", "Âme", "Stephan Bodzin",
        # Rock / Alternative
        "Radiohead", "Sigur Rós", "Explosions in the Sky", "God Is An Astronaut",
        "Mogwai", "Godspeed You! Black Emperor", "Muse", "Arctic Monkeys",
        # Pop / Indie
        "The Weeknd", "Billie Eilish", "Lana Del Rey", "Tame Impala",
        "MGMT", "The xx", "Alt-J", "Glass Animals", "Phoenix"
    ]
    
    # Filter by input prefix
    filtered = [c for c in candidates if input_text.lower() in c.lower()]
    if not filtered:
        filtered = candidates
    
    # Compute embeddings
    context_embedding = model.encode(context_text, convert_to_tensor=True)
    candidate_embeddings = model.encode(filtered, convert_to_tensor=True)
    
    # Calculate similarity
    scores = util.cos_sim(context_embedding, candidate_embeddings)[0]
    
    # Get top 5 unique suggestions
    top_indices = scores.argsort(descending=True)[:8]
    suggestions = []
    seen = set(context.get('artistInspiration', []))
    
    for idx in top_indices:
        candidate = filtered[idx.item()]
        if candidate not in seen and candidate not in suggestions:
            suggestions.append(candidate)
        if len(suggestions) >= 5:
            break
    
    return suggestions

def suggest_languages(input_text, context):
    """Generate language suggestions based on context"""
    model = load_model()
    
    # Build context from prompt and lyrics
    context_parts = []
    if context.get('musicPrompt'):
        context_parts.append(context['musicPrompt'])
    if context.get('lyrics'):
        context_parts.append(context['lyrics'][:200])  # First 200 chars
    
    context_text = ' '.join(context_parts) + ' ' + input_text
    
    # Language candidates with cultural context
    candidates = [
        "English", "Spanish", "French", "German", "Italian", "Portuguese",
        "Japanese", "Korean", "Chinese", "Hindi", "Arabic", "Russian",
        "Dutch", "Swedish", "Norwegian", "Danish", "Finnish",
        "Polish", "Turkish", "Greek", "Hebrew", "Thai", "Vietnamese",
        "Indonesian", "Tagalog", "Tamil", "Telugu", "Bengali",
        "Marathi", "Punjabi", "Urdu", "Swahili", "Zulu"
    ]
    
    # Filter by input prefix
    filtered = [c for c in candidates if input_text.lower() in c.lower()]
    if not filtered:
        filtered = candidates
    
    # Compute embeddings
    context_embedding = model.encode(context_text, convert_to_tensor=True)
    candidate_embeddings = model.encode(filtered, convert_to_tensor=True)
    
    # Calculate similarity
    scores = util.cos_sim(context_embedding, candidate_embeddings)[0]
    
    # Get top 5 unique suggestions
    top_indices = scores.argsort(descending=True)[:8]
    suggestions = []
    seen = set(context.get('vocalLanguages', []))
    
    for idx in top_indices:
        candidate = filtered[idx.item()]
        if candidate not in seen and candidate not in suggestions:
            suggestions.append(candidate)
        if len(suggestions) >= 5:
            break
    
    return suggestions

def main():
    """Main entry point"""
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        field = input_data.get('field')
        input_text = input_data.get('input', '')
        context = input_data.get('context', {})
        
        # Generate suggestions based on field
        if field == 'genres':
            suggestions = suggest_genres(input_text, context)
        elif field == 'artistInspiration':
            suggestions = suggest_artists(input_text, context)
        elif field == 'vocalLanguages':
            suggestions = suggest_languages(input_text, context)
        else:
            suggestions = []
        
        # Return JSON response
        print(json.dumps({'suggestions': suggestions}))
        sys.exit(0)
        
    except Exception as e:
        print(json.dumps({'error': str(e), 'suggestions': []}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
