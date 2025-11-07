## Enabling Optional Models

The backend ships with DSP fallbacks, but you can install open models locally:

1. Install Python 3.10+, pip, ffmpeg, fluidsynth.
2. Download a SoundFont such as GeneralUser GS and set `SOUND_FONT_PATH`.
3. Install modules:
   ```bash
   pip install riffusion
   pip install magenta
   pip install TTS
   ```
4. Export environment variables:
   ```
   PYTHON_BIN=python3
   SOUND_FONT_PATH=/path/to/GeneralUser_GS.sf2
   ```
5. Verify:
   ```bash
   python3 -c "import riffusion, magenta, TTS"
   fluidsynth -V
   ```
Once installed, the backend detects them automatically and upgrades the generation pipeline.
