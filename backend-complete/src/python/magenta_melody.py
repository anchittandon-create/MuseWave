#!/usr/bin/env python3
"""
Magenta Melody Generation Script
Generates MIDI melody using MelodyRNN model
"""

import argparse
import sys
import os

def main():
    parser = argparse.ArgumentParser(description='Generate MIDI melody with Magenta')
    parser.add_argument('--duration', type=float, required=True, help='Duration in seconds')
    parser.add_argument('--output', required=True, help='Output MIDI file path')
    parser.add_argument('--temperature', type=float, default=1.0, help='Sampling temperature')
    parser.add_argument('--steps-per-quarter', type=int, default=4, help='Steps per quarter note')
    parser.add_argument('--seed', type=int, default=None, help='Random seed')
    
    args = parser.parse_args()

    try:
        from magenta.models.melody_rnn import melody_rnn_sequence_generator
        from magenta.models.melody_rnn import melody_rnn_model
        import magenta.music as mm
        from magenta.models.shared import sequence_generator_bundle
        import tensorflow as tf
        import numpy as np
        
        if args.seed is not None:
            np.random.seed(args.seed)
            tf.random.set_seed(args.seed)
        
        # Load pre-trained model
        bundle = sequence_generator_bundle.read_bundle_file(
            'magenta/models/melody_rnn/basic_rnn.mag'
        )
        
        generator_map = melody_rnn_sequence_generator.get_generator_map()
        melody_rnn = generator_map['basic_rnn'](checkpoint=None, bundle=bundle)
        melody_rnn.initialize()
        
        # Generate melody
        qpm = 120  # Quarters per minute (tempo)
        num_steps = int((args.duration / 60) * qpm * args.steps_per_quarter)
        
        generator_options = melody_rnn_sequence_generator.MelodyRnnGeneratorOptions()
        generator_options.temperature = args.temperature
        
        # Create primer sequence (empty)
        primer_sequence = mm.Melody()
        
        # Generate
        generated_sequence = melody_rnn.generate(
            primer_sequence,
            generator_options,
            total_steps=num_steps,
        )
        
        # Save MIDI
        mm.sequence_proto_to_midi_file(generated_sequence, args.output)
        
        print(f"Generated MIDI: {args.output}")
        sys.exit(0)
        
    except ImportError as e:
        print(f"Error: Magenta not installed. {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error generating melody: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
