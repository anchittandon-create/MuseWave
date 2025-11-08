#!/usr/bin/env python3
"""
Coqui TTS Vocal Generation Script
Generates spoken/sung vocals from text using Coqui TTS
"""

import argparse
import sys
import os

def main():
    parser = argparse.ArgumentParser(description='Generate vocals with Coqui TTS')
    parser.add_argument('--text', required=True, help='Text/lyrics to synthesize')
    parser.add_argument('--output', required=True, help='Output WAV file path')
    parser.add_argument('--language', default='en', help='Language code (en, es, fr, etc.)')
    parser.add_argument('--speaker', default=None, help='Speaker ID')
    parser.add_argument('--emotion', default='neutral', help='Emotion (neutral, happy, sad, etc.)')
    
    args = parser.parse_args()

    try:
        from TTS.api import TTS
        
        # Initialize TTS with multi-speaker model
        tts = TTS(model_name="tts_models/en/vctk/vits", progress_bar=False)
        
        # Select speaker based on emotion
        speaker_map = {
            'neutral': 'p225',
            'energetic': 'p226',
            'calm': 'p227',
            'dramatic': 'p228',
        }
        
        speaker = args.speaker or speaker_map.get(args.emotion, 'p225')
        
        # Generate audio
        tts.tts_to_file(
            text=args.text,
            speaker=speaker,
            file_path=args.output,
        )
        
        print(f"Generated vocals: {args.output}")
        sys.exit(0)
        
    except ImportError as e:
        print(f"Error: Coqui TTS not installed. {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error generating vocals: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
