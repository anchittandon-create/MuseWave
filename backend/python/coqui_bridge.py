#!/usr/bin/env python3
"""
Coqui TTS Bridge - Text-to-Speech Synthesis
Uses Coqui TTS (MPL 2.0) for vocal generation
Fallback: Uses system TTS or generates tone-based speech
"""
import argparse
import json
import os
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

def generate_with_coqui(text: str, output_path: str, language: str = "en", speaker: str = None) -> dict:
    """Generate vocals using Coqui TTS"""
    try:
        from TTS.api import TTS
        
        print(f"[CoquiTTS] Loading model for language: {language}", file=sys.stderr)
        
        # Language to model mapping
        model_map = {
            "en": "tts_models/en/ljspeech/tacotron2-DDC",
            "es": "tts_models/es/mai/tacotron2-DDC",
            "fr": "tts_models/fr/mai/tacotron2-DDC",
            "de": "tts_models/de/thorsten/tacotron2-DDC",
            "it": "tts_models/it/mai_female/glow-tts",
            "pt": "tts_models/pt/cv/vits",
            "pl": "tts_models/pl/mai_female/vits",
            "tr": "tts_models/tr/common-voice/glow-tts",
            "ru": "tts_models/ru/multi-dataset/vits",
            "nl": "tts_models/nl/mai/tacotron2-DDC",
            "cs": "tts_models/cs/cv/vits",
            "ar": "tts_models/ar/cv/vits",
            "zh": "tts_models/zh-CN/baker/tacotron2-DDC-GST",
            "ja": "tts_models/ja/kokoro/tacotron2-DDC",
            "ko": "tts_models/ko/cv/vits"
        }
        
        model_name = model_map.get(language, model_map["en"])
        
        # Initialize TTS
        tts = TTS(model_name=model_name, progress_bar=False, gpu=False)
        
        print(f"[CoquiTTS] Generating speech for: {text[:50]}...", file=sys.stderr)
        
        # Generate
        tts.tts_to_file(text=text, file_path=output_path)
        
        # Get duration
        import soundfile as sf
        audio, sr = sf.read(output_path)
        duration = len(audio) / sr
        
        return {
            "success": True,
            "output_path": output_path,
            "duration": duration,
            "sample_rate": sr,
            "text_length": len(text),
            "engine": "CoquiTTS",
            "model": model_name,
            "language": language
        }
        
    except ImportError as e:
        print(f"[CoquiTTS] Import failed: {e}", file=sys.stderr)
        return generate_fallback_speech(text, output_path, language, "ImportError")
    except Exception as e:
        print(f"[CoquiTTS] Generation failed: {e}", file=sys.stderr)
        return generate_fallback_speech(text, output_path, language, str(e))


def generate_fallback_speech(text: str, output_path: str, language: str, reason: str) -> dict:
    """Generate robotic speech as fallback"""
    try:
        import numpy as np
        import soundfile as sf
        
        print(f"[Fallback] Generating robotic speech: {reason}", file=sys.stderr)
        
        sample_rate = 22050
        
        # Estimate duration based on speech rate (190 words per minute)
        words = len(text.split())
        duration = max(2.0, words / 190 * 60)
        
        # Generate carrier tone (monotone voice at ~150 Hz)
        samples = int(sample_rate * duration)
        t = np.linspace(0, duration, samples)
        
        # Base frequency (monotone voice)
        base_freq = 150
        carrier = np.sin(2 * np.pi * base_freq * t)
        
        # Add harmonics for richness
        carrier += 0.3 * np.sin(2 * np.pi * base_freq * 2 * t)
        carrier += 0.15 * np.sin(2 * np.pi * base_freq * 3 * t)
        
        # Create word-like rhythm
        words_in_text = len(text.split())
        word_duration = duration / max(1, words_in_text)
        
        # Apply amplitude modulation for speech-like rhythm
        word_envelope = np.ones(samples)
        for i in range(words_in_text):
            start_idx = int(i * word_duration * sample_rate)
            end_idx = int((i + 1) * word_duration * sample_rate)
            if end_idx > samples:
                end_idx = samples
            
            # Create word envelope (attack-sustain-release)
            word_len = end_idx - start_idx
            attack = int(word_len * 0.1)
            release = int(word_len * 0.2)
            
            if start_idx + attack < samples:
                word_envelope[start_idx:start_idx + attack] = np.linspace(0.3, 1.0, attack)
            if end_idx - release >= 0 and end_idx <= samples:
                word_envelope[end_idx - release:end_idx] = np.linspace(1.0, 0.3, release)
        
        # Apply envelope
        audio = carrier * word_envelope * 0.4
        
        # Add slight formant filtering (vowel-like resonance)
        # Simple low-pass to simulate formants
        from scipy import signal
        b, a = signal.butter(4, 2000 / (sample_rate / 2), 'low')
        audio = signal.filtfilt(b, a, audio)
        
        # Normalize
        audio = audio / np.max(np.abs(audio)) * 0.7
        
        # Save
        sf.write(output_path, audio, sample_rate)
        
        return {
            "success": True,
            "output_path": output_path,
            "duration": duration,
            "sample_rate": sample_rate,
            "text_length": len(text),
            "engine": "Fallback (Robotic)",
            "language": language,
            "reason": reason
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "engine": "Fallback",
            "reason": reason
        }


def main():
    parser = argparse.ArgumentParser(description="Coqui TTS Vocal Generator")
    parser.add_argument("--text", required=True, help="Text to synthesize")
    parser.add_argument("--output", required=True, help="Output WAV file path")
    parser.add_argument("--language", default="en", help="Language code (en, es, fr, etc.)")
    parser.add_argument("--speaker", default=None, help="Speaker ID (optional)")
    
    args = parser.parse_args()
    
    # Ensure output directory exists
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    
    # Generate
    result = generate_with_coqui(args.text, args.output, args.language, args.speaker)
    
    # Output JSON result
    print(json.dumps(result, indent=2))
    
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
