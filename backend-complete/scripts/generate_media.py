#!/usr/bin/env python3
"""
MuseWave - Complete Audio & Video Generation Pipeline
Generates playable audio and video files with proper validation.

Usage:
    python3 generate_media.py "dreamy synthwave" "Riding through the neon rain" "English"
    python3 generate_media.py --prompt "epic orchestral" --lyrics "..." --language "Spanish"
"""

import subprocess
import os
import sys
import uuid
import tempfile
import argparse
import json
from pathlib import Path

# Configuration
DEFAULT_SAMPLE_RATE = 44100
DEFAULT_CHANNELS = 2
MIN_FILE_SIZE = 10000  # 10KB minimum to consider file valid
VIDEO_WIDTH = 1280
VIDEO_HEIGHT = 720
VIDEO_FPS = 30

class MediaGenerator:
    """Handles audio and video generation with validation"""
    
    def __init__(self, job_id=None, output_dir=None):
        self.job_id = job_id or str(uuid.uuid4())[:8]
        self.output_dir = output_dir or f"public/assets/{self.job_id}"
        os.makedirs(self.output_dir, exist_ok=True)
        
        # File paths
        self.paths = {
            'midi': os.path.join(self.output_dir, 'melody.mid'),
            'wav_midi': os.path.join(self.output_dir, 'melody.wav'),
            'wav_texture': os.path.join(self.output_dir, 'texture.wav'),
            'wav_vocals': os.path.join(self.output_dir, 'vocals.wav'),
            'wav_mix': os.path.join(self.output_dir, 'mix.wav'),
            'mp4_video': os.path.join(self.output_dir, 'final.mp4'),
            'metadata': os.path.join(self.output_dir, 'metadata.json'),
        }
        
    def run_command(self, cmd, output_file=None, description=""):
        """Execute command with error handling and validation"""
        print(f"\n{'='*60}")
        print(f"📋 {description or 'Running command'}")
        print(f"→ {' '.join(cmd)}")
        print(f"{'='*60}")
        
        try:
            result = subprocess.run(
                cmd,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            if result.stdout:
                print(f"✓ stdout: {result.stdout[:200]}")
            
            # Validate output file if specified
            if output_file:
                self.validate_file(output_file, description)
                
            print(f"✅ Success: {description}")
            return result
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error: {description}")
            print(f"   Return code: {e.returncode}")
            print(f"   stderr: {e.stderr}")
            raise RuntimeError(f"Failed to {description}: {e.stderr}")
    
    def validate_file(self, filepath, description="File"):
        """Validate that file exists and has minimum size"""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"{description} not created: {filepath}")
        
        size = os.path.getsize(filepath)
        if size < MIN_FILE_SIZE:
            raise ValueError(f"{description} is too small ({size} bytes): {filepath}")
        
        print(f"✓ Validated: {filepath} ({size:,} bytes)")
        return True
    
    def check_dependencies(self):
        """Check if required tools are installed"""
        dependencies = {
            'ffmpeg': 'brew install ffmpeg',
            'ffprobe': 'brew install ffmpeg',
            'fluidsynth': 'brew install fluidsynth',
            'python3': 'Already installed',
        }
        
        missing = []
        for tool, install_cmd in dependencies.items():
            try:
                subprocess.run([tool, '--version'], 
                             stdout=subprocess.PIPE, 
                             stderr=subprocess.PIPE,
                             check=True)
                print(f"✅ {tool} found")
            except (subprocess.CalledProcessError, FileNotFoundError):
                print(f"❌ {tool} not found. Install with: {install_cmd}")
                missing.append(tool)
        
        if missing:
            raise RuntimeError(f"Missing dependencies: {', '.join(missing)}")
        
        return True
    
    def generate_melody(self, duration_steps=128, temperature=1.0):
        """Generate melody using Magenta (if available) or fallback"""
        try:
            # Try Magenta first
            cmd = [
                "python3", "-m", "magenta.models.melody_rnn.melody_rnn_generate",
                "--config=attention_rnn",
                "--bundle_file=/usr/local/share/magenta_models/attention_rnn.mag",
                "--output_dir", self.output_dir,
                "--num_outputs=1",
                f"--num_steps={duration_steps}",
                f"--temperature={temperature}"
            ]
            self.run_command(cmd, self.paths['midi'], "Generate melody with Magenta")
            
        except Exception as e:
            print(f"⚠️  Magenta not available: {e}")
            print("📝 Generating fallback MIDI...")
            self.generate_fallback_midi()
    
    def generate_fallback_midi(self):
        """Generate simple MIDI file as fallback"""
        try:
            from midiutil import MIDIFile
            
            midi = MIDIFile(1)
            midi.addTempo(0, 0, 120)
            
            # Simple melody pattern
            notes = [60, 62, 64, 65, 67, 69, 71, 72]  # C major scale
            for i, note in enumerate(notes * 4):
                midi.addNote(0, 0, note, i * 0.5, 0.5, 100)
            
            with open(self.paths['midi'], 'wb') as f:
                midi.writeFile(f)
            
            self.validate_file(self.paths['midi'], "Fallback MIDI")
            
        except ImportError:
            print("⚠️  MIDIUtil not installed. Install with: pip install MIDIUtil")
            raise
    
    def midi_to_wav(self):
        """Convert MIDI to WAV using FluidSynth"""
        soundfont = "/usr/local/share/soundfonts/GeneralUser.sf2"
        
        if not os.path.exists(soundfont):
            print(f"⚠️  Soundfont not found: {soundfont}")
            print("   Download with:")
            print("   wget https://schristiancollins.com/GeneralUser_GS_1.471.sf2 \\")
            print(f"        -O {soundfont}")
            raise FileNotFoundError(f"Soundfont missing: {soundfont}")
        
        cmd = [
            "fluidsynth",
            "-ni",  # Non-interactive
            soundfont,
            self.paths['midi'],
            "-F", self.paths['wav_midi'],
            "-r", str(DEFAULT_SAMPLE_RATE)
        ]
        
        self.run_command(cmd, self.paths['wav_midi'], "Convert MIDI to WAV")
    
    def generate_texture(self, prompt):
        """Generate texture/background audio using Riffusion or FFmpeg"""
        try:
            # Try Riffusion first
            cmd = [
                "python3", "-m", "riffusion.cli",
                "--prompt", prompt,
                "--output", self.paths['wav_texture']
            ]
            self.run_command(cmd, self.paths['wav_texture'], "Generate texture with Riffusion")
            
        except Exception as e:
            print(f"⚠️  Riffusion not available: {e}")
            print("📝 Generating fallback texture...")
            self.generate_fallback_texture()
    
    def generate_fallback_texture(self, duration=30):
        """Generate simple ambient texture using FFmpeg"""
        # Create warm pad sound with sine waves
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", f"sine=frequency=220:duration={duration}",
            "-f", "lavfi",
            "-i", f"sine=frequency=329.63:duration={duration}",
            "-f", "lavfi",
            "-i", f"sine=frequency=440:duration={duration}",
            "-filter_complex",
            "[0][1][2]amix=inputs=3:normalize=0,volume=0.3,asetrate=44100*0.99,aresample=44100",
            "-ar", str(DEFAULT_SAMPLE_RATE),
            "-ac", str(DEFAULT_CHANNELS),
            self.paths['wav_texture']
        ]
        
        self.run_command(cmd, self.paths['wav_texture'], "Generate fallback texture")
    
    def generate_vocals(self, lyrics, language="English"):
        """Generate vocals using Coqui TTS"""
        if not lyrics or not lyrics.strip():
            print("ℹ️  No lyrics provided, skipping vocals")
            return False
        
        try:
            cmd = [
                "tts",
                "--text", lyrics,
                "--out_path", self.paths['wav_vocals'],
                "--speaker_idx", "p231",
                "--language_idx", language
            ]
            self.run_command(cmd, self.paths['wav_vocals'], "Generate vocals with TTS")
            return True
            
        except Exception as e:
            print(f"⚠️  TTS generation failed: {e}")
            print("ℹ️  Continuing without vocals")
            return False
    
    def mix_audio(self):
        """Mix all audio stems into final track"""
        # Collect available input files
        inputs = []
        input_files = []
        
        # Always include texture and melody
        if os.path.exists(self.paths['wav_texture']):
            inputs.extend(["-i", self.paths['wav_texture']])
            input_files.append(self.paths['wav_texture'])
        
        if os.path.exists(self.paths['wav_midi']):
            inputs.extend(["-i", self.paths['wav_midi']])
            input_files.append(self.paths['wav_midi'])
        
        # Optional vocals
        has_vocals = os.path.exists(self.paths['wav_vocals'])
        if has_vocals:
            inputs.extend(["-i", self.paths['wav_vocals']])
            input_files.append(self.paths['wav_vocals'])
        
        if not input_files:
            raise ValueError("No audio files available for mixing")
        
        num_inputs = len(input_files)
        print(f"🎚️  Mixing {num_inputs} audio stems:")
        for f in input_files:
            print(f"   • {os.path.basename(f)}")
        
        # Build filter chain
        filter_complex = f"amix=inputs={num_inputs}:normalize=0,alimiter,aresample={DEFAULT_SAMPLE_RATE},volume=1.2"
        
        cmd = [
            "ffmpeg", "-y"
        ] + inputs + [
            "-filter_complex", filter_complex,
            "-ar", str(DEFAULT_SAMPLE_RATE),
            "-ac", str(DEFAULT_CHANNELS),
            self.paths['wav_mix']
        ]
        
        self.run_command(cmd, self.paths['wav_mix'], "Mix audio stems")
        
        # Verify the mix is stereo and has correct sample rate
        self.verify_audio_format(self.paths['wav_mix'])
    
    def verify_audio_format(self, filepath):
        """Verify audio file has correct format"""
        cmd = ["ffprobe", "-v", "error", "-show_streams", "-of", "json", filepath]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        data = json.loads(result.stdout)
        if not data.get('streams'):
            raise ValueError(f"No audio streams found in {filepath}")
        
        stream = data['streams'][0]
        sample_rate = int(stream.get('sample_rate', 0))
        channels = int(stream.get('channels', 0))
        codec = stream.get('codec_name', '')
        
        print(f"🔍 Audio format: {codec}, {sample_rate}Hz, {channels} channels")
        
        if sample_rate != DEFAULT_SAMPLE_RATE:
            print(f"⚠️  Warning: Sample rate is {sample_rate}, expected {DEFAULT_SAMPLE_RATE}")
        
        if channels != DEFAULT_CHANNELS:
            print(f"⚠️  Warning: Channels is {channels}, expected {DEFAULT_CHANNELS}")
        
        return True
    
    def generate_video(self, video_style="spectrum"):
        """Generate video visualizer from audio"""
        if not os.path.exists(self.paths['wav_mix']):
            raise FileNotFoundError("Audio mix not found for video generation")
        
        # Different visualization styles
        filters = {
            "spectrum": f"showspectrum=s={VIDEO_WIDTH}x{VIDEO_HEIGHT}:color=rainbow:legend=disabled",
            "waveform": f"showwaves=s={VIDEO_WIDTH}x{VIDEO_HEIGHT}:mode=cline:colors=cyan",
            "volumeter": f"avectorscope=s={VIDEO_WIDTH}x{VIDEO_HEIGHT}:zoom=1.5:draw=line",
        }
        
        video_filter = filters.get(video_style, filters["spectrum"])
        
        cmd = [
            "ffmpeg", "-y",
            "-i", self.paths['wav_mix'],
            "-filter_complex", video_filter,
            "-r", str(VIDEO_FPS),
            "-pix_fmt", "yuv420p",
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-shortest",
            self.paths['mp4_video']
        ]
        
        self.run_command(cmd, self.paths['mp4_video'], "Generate video visualizer")
        self.verify_video_format(self.paths['mp4_video'])
    
    def verify_video_format(self, filepath):
        """Verify video file has correct format"""
        cmd = ["ffprobe", "-v", "error", "-show_streams", "-of", "json", filepath]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        data = json.loads(result.stdout)
        streams = data.get('streams', [])
        
        video_stream = next((s for s in streams if s.get('codec_type') == 'video'), None)
        audio_stream = next((s for s in streams if s.get('codec_type') == 'audio'), None)
        
        if not video_stream:
            raise ValueError(f"No video stream found in {filepath}")
        
        print(f"🔍 Video format: {video_stream.get('codec_name')}, "
              f"{video_stream.get('width')}x{video_stream.get('height')}, "
              f"{video_stream.get('r_frame_rate')} fps")
        
        if audio_stream:
            print(f"🔍 Audio track: {audio_stream.get('codec_name')}, "
                  f"{audio_stream.get('sample_rate')}Hz")
        
        return True
    
    def save_metadata(self, prompt, lyrics, language):
        """Save generation metadata"""
        metadata = {
            'job_id': self.job_id,
            'prompt': prompt,
            'lyrics': lyrics,
            'language': language,
            'files': {
                'audio': os.path.basename(self.paths['wav_mix']),
                'video': os.path.basename(self.paths['mp4_video']),
            },
            'output_dir': self.output_dir,
        }
        
        with open(self.paths['metadata'], 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"\n📄 Metadata saved: {self.paths['metadata']}")
    
    def generate_all(self, prompt, lyrics="", language="English", video_style="spectrum"):
        """Complete generation pipeline"""
        print(f"\n{'='*60}")
        print(f"🎵 MuseWave Media Generation")
        print(f"{'='*60}")
        print(f"Job ID: {self.job_id}")
        print(f"Prompt: {prompt}")
        print(f"Lyrics: {lyrics[:50] + '...' if len(lyrics) > 50 else lyrics}")
        print(f"Language: {language}")
        print(f"Output: {self.output_dir}")
        print(f"{'='*60}\n")
        
        try:
            # Check dependencies
            self.check_dependencies()
            
            # Generate melody
            print("\n🎹 Step 1/5: Generating melody...")
            self.generate_melody()
            self.midi_to_wav()
            
            # Generate texture
            print("\n🎨 Step 2/5: Generating texture...")
            self.generate_texture(prompt)
            
            # Generate vocals (optional)
            print("\n🎤 Step 3/5: Generating vocals...")
            self.generate_vocals(lyrics, language)
            
            # Mix audio
            print("\n🎚️  Step 4/5: Mixing audio...")
            self.mix_audio()
            
            # Generate video
            print("\n🎬 Step 5/5: Generating video...")
            self.generate_video(video_style)
            
            # Save metadata
            self.save_metadata(prompt, lyrics, language)
            
            print(f"\n{'='*60}")
            print(f"✅ Generation Complete!")
            print(f"{'='*60}")
            print(f"📂 Output directory: {self.output_dir}")
            print(f"🎵 Audio: {self.paths['wav_mix']}")
            print(f"🎬 Video: {self.paths['mp4_video']}")
            print(f"{'='*60}\n")
            
            return {
                'success': True,
                'job_id': self.job_id,
                'audio_url': self.paths['wav_mix'],
                'video_url': self.paths['mp4_video'],
                'output_dir': self.output_dir,
            }
            
        except Exception as e:
            print(f"\n{'='*60}")
            print(f"❌ Generation Failed!")
            print(f"{'='*60}")
            print(f"Error: {str(e)}")
            print(f"{'='*60}\n")
            raise


def main():
    parser = argparse.ArgumentParser(
        description='MuseWave Audio & Video Generator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s "dreamy synthwave"
  %(prog)s "epic orchestral" "Riding through the stars" "English"
  %(prog)s --prompt "chill lofi" --lyrics "..." --language "Spanish"
        """
    )
    
    parser.add_argument('prompt', nargs='?', default='dreamy synthwave',
                       help='Music generation prompt')
    parser.add_argument('lyrics', nargs='?', default='',
                       help='Lyrics text (optional)')
    parser.add_argument('language', nargs='?', default='English',
                       help='Vocal language (default: English)')
    parser.add_argument('--job-id', help='Custom job ID')
    parser.add_argument('--output-dir', help='Custom output directory')
    parser.add_argument('--video-style', default='spectrum',
                       choices=['spectrum', 'waveform', 'volumeter'],
                       help='Video visualization style')
    
    args = parser.parse_args()
    
    generator = MediaGenerator(
        job_id=args.job_id,
        output_dir=args.output_dir
    )
    
    result = generator.generate_all(
        prompt=args.prompt,
        lyrics=args.lyrics,
        language=args.language,
        video_style=args.video_style
    )
    
    return result


if __name__ == '__main__':
    try:
        result = main()
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}", file=sys.stderr)
        sys.exit(1)
