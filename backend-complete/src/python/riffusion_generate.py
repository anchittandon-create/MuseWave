#!/usr/bin/env python3
"""
Riffusion Audio Generation Script
Generates audio texture from text prompt using Riffusion diffusion model
"""

import argparse
import sys
import os

def main():
    parser = argparse.ArgumentParser(description='Generate audio with Riffusion')
    parser.add_argument('--prompt', required=True, help='Text prompt for generation')
    parser.add_argument('--duration', type=float, required=True, help='Duration in seconds')
    parser.add_argument('--output', required=True, help='Output WAV file path')
    parser.add_argument('--seed', type=int, default=None, help='Random seed')
    parser.add_argument('--steps', type=int, default=50, help='Inference steps')
    parser.add_argument('--guidance', type=float, default=7.0, help='Guidance scale')
    
    args = parser.parse_args()

    try:
        from riffusion.spectrogram_params import SpectrogramParams
        from riffusion.riffusion_pipeline import RiffusionPipeline
        import torch
        
        # Initialize pipeline
        device = "cuda" if torch.cuda.is_available() else "cpu"
        pipeline = RiffusionPipeline.load_checkpoint(
            checkpoint="riffusion/riffusion-model-v1",
            device=device,
        )
        
        # Generate spectrogram
        result = pipeline.riffuse(
            inputs={"prompt": args.prompt},
            seed=args.seed,
            num_inference_steps=args.steps,
            guidance_scale=args.guidance,
        )
        
        # Convert spectrogram to audio
        audio = result.audio
        
        # Save audio
        import soundfile as sf
        sf.write(args.output, audio, samplerate=44100)
        
        print(f"Generated audio: {args.output}")
        sys.exit(0)
        
    except ImportError as e:
        print(f"Error: Riffusion not installed. {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error generating audio: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
