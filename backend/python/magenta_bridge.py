#!/usr/bin/env python3
"""
Magenta Bridge - MIDI Melody Generation
Uses Google Magenta (Apache 2.0) for melody composition
Fallback: Returns simple MIDI sequence if model unavailable
"""
import argparse
import json
import os
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

def generate_with_magenta(duration_sec: int, output_midi: str, bpm: int = 120, key: str = "C") -> dict:
    """Generate MIDI using Magenta melody_rnn"""
    try:
        import magenta
        from magenta.models.melody_rnn import melody_rnn_sequence_generator
        from magenta.models.shared import sequence_generator_bundle
        import note_seq
        from note_seq.protobuf import generator_pb2, music_pb2
        
        print(f"[Magenta] Loading melody_rnn model...", file=sys.stderr)
        
        # Load pre-trained model
        bundle = sequence_generator_bundle.read_bundle_file(
            os.path.expanduser('~/.magenta/models/melody_rnn/basic_rnn.mag')
        )
        
        generator_map = melody_rnn_sequence_generator.get_generator_map()
        generator = generator_map['basic_rnn'](checkpoint=None, bundle=bundle)
        generator.initialize()
        
        print(f"[Magenta] Generating melody (duration: {duration_sec}s, bpm: {bpm})", file=sys.stderr)
        
        # Create generation options
        num_steps = int((duration_sec * bpm) / 60 * 4)  # 16th notes
        temperature = 1.0
        
        generator_options = generator_pb2.GeneratorOptions()
        generator_options.args['temperature'].float_value = temperature
        generator_options.generate_sections.add(
            start_time=0,
            end_time=duration_sec
        )
        
        # Generate sequence
        sequence = generator.generate(music_pb2.NoteSequence(), generator_options)
        
        # Set tempo
        sequence.tempos.add(qpm=bpm)
        
        # Write MIDI
        note_seq.sequence_proto_to_midi_file(sequence, output_midi)
        
        note_count = len(sequence.notes)
        
        return {
            "success": True,
            "output_path": output_midi,
            "duration": duration_sec,
            "bpm": bpm,
            "note_count": note_count,
            "engine": "Magenta (melody_rnn)"
        }
        
    except Exception as e:
        print(f"[Magenta] Generation failed: {e}", file=sys.stderr)
        return generate_fallback_midi(duration_sec, output_midi, bpm, key, str(e))


def generate_fallback_midi(duration_sec: int, output_midi: str, bpm: int, key: str, reason: str) -> dict:
    """Generate simple MIDI as fallback"""
    try:
        from midiutil import MIDIFile
        
        print(f"[Fallback] Generating procedural MIDI: {reason}", file=sys.stderr)
        
        # Create MIDI file
        midi = MIDIFile(1)
        track = 0
        channel = 0
        time = 0
        midi.addTempo(track, time, bpm)
        
        # Key to root note mapping
        key_map = {
            "C": 60, "C#": 61, "D": 62, "D#": 63, "E": 64, "F": 65,
            "F#": 66, "G": 67, "G#": 68, "A": 69, "A#": 70, "B": 71
        }
        root = key_map.get(key.split()[0], 60)  # Default to C
        
        # Generate chord progression (I - V - vi - IV)
        chords = [
            [root, root + 4, root + 7],          # I (major)
            [root + 7, root + 11, root + 14],    # V (major)
            [root + 9, root + 12, root + 16],    # vi (minor)
            [root + 5, root + 9, root + 12]      # IV (major)
        ]
        
        # Calculate beats
        beats_per_chord = 4
        total_beats = int((duration_sec / 60) * bpm)
        num_progressions = max(1, total_beats // (len(chords) * beats_per_chord))
        
        current_beat = 0
        velocity = 80
        
        for _ in range(num_progressions):
            for chord in chords:
                # Add chord notes
                for note in chord:
                    midi.addNote(track, channel, note, current_beat, beats_per_chord, velocity)
                
                # Add melody note
                melody_note = chord[0] + 12  # Octave above root
                midi.addNote(track, channel, melody_note, current_beat, 1, velocity + 20)
                midi.addNote(track, channel, melody_note + 2, current_beat + 1, 1, velocity + 20)
                midi.addNote(track, channel, melody_note + 4, current_beat + 2, 1, velocity + 20)
                midi.addNote(track, channel, melody_note + 2, current_beat + 3, 1, velocity + 20)
                
                current_beat += beats_per_chord
                
                if current_beat >= total_beats:
                    break
            
            if current_beat >= total_beats:
                break
        
        # Write MIDI file
        with open(output_midi, 'wb') as f:
            midi.writeFile(f)
        
        return {
            "success": True,
            "output_path": output_midi,
            "duration": duration_sec,
            "bpm": bpm,
            "note_count": len(chords) * 4 * num_progressions,
            "engine": "Fallback (MIDIUtil)",
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
    parser = argparse.ArgumentParser(description="Magenta MIDI Generator")
    parser.add_argument("--duration", type=int, default=30, help="Duration in seconds")
    parser.add_argument("--output", required=True, help="Output MIDI file path")
    parser.add_argument("--bpm", type=int, default=120, help="Tempo in BPM")
    parser.add_argument("--key", default="C", help="Musical key")
    
    args = parser.parse_args()
    
    # Ensure output directory exists
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    
    # Generate
    result = generate_with_magenta(args.duration, args.output, args.bpm, args.key)
    
    # Output JSON result
    print(json.dumps(result, indent=2))
    
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
