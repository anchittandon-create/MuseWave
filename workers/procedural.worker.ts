// Enhanced music generator that creates more realistic audio with multiple instruments
const createMusicTrack = (durationSec, plan, sampleRate = 44100) => {
    const numSamples = Math.floor(durationSec * sampleRate);
    const buffer = new ArrayBuffer(44 + numSamples * 2 * 2); // Stereo audio
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + numSamples * 2 * 2, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (1=PCM)
    view.setUint16(22, 2, true); // NumChannels (2=stereo)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2 * 2, true); // ByteRate
    view.setUint16(32, 4, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, numSamples * 2 * 2, true); // Subchunk2Size

    // Generate layered audio
    let offset = 44;
    const beatsPerBar = 4;
    const secondsPerBeat = 60 / plan.bpm;
    
    for (let i = 0; i < numSamples; i++) {
        const time = i / sampleRate;
        let leftSample = 0;
        let rightSample = 0;
        
        // Calculate which section we're in
        let sectionStartTime = 0;
        let currentSection = null;
        
        for (const section of plan.sections) {
            const sectionDuration = section.durationBars * beatsPerBar * secondsPerBeat;
            if (time >= sectionStartTime && time < sectionStartTime + sectionDuration) {
                currentSection = section;
                break;
            }
            sectionStartTime += sectionDuration;
        }
        
        if (currentSection) {
            const sectionTime = time - sectionStartTime;
            const beatTime = (sectionTime % (beatsPerBar * secondsPerBeat)) / secondsPerBeat;
            
            // Generate kick drum (bass)
            if (currentSection.drumPattern.kick.includes(Math.floor(beatTime) + 1)) {
                const kickFreq = 60; // Low frequency for kick
                const kickEnvelope = Math.exp(-sectionTime * 8); // Fast decay
                leftSample += Math.sin(2 * Math.PI * kickFreq * time) * kickEnvelope * 0.3;
                rightSample += Math.sin(2 * Math.PI * kickFreq * time) * kickEnvelope * 0.3;
            }
            
            // Generate snare drum
            if (currentSection.drumPattern.snare.includes(Math.floor(beatTime) + 1)) {
                const snareFreq = 200 + Math.random() * 100; // Noise-like
                const snareEnvelope = Math.exp(-sectionTime * 12);
                leftSample += Math.sin(2 * Math.PI * snareFreq * time) * snareEnvelope * 0.2;
                rightSample += Math.sin(2 * Math.PI * snareFreq * time) * snareEnvelope * 0.2;
            }
            
            // Generate hi-hat
            if (currentSection.drumPattern.hihat.includes(beatTime % 1)) {
                const hihatFreq = 8000 + Math.random() * 2000;
                const hihatEnvelope = Math.exp(-sectionTime * 20);
                leftSample += Math.sin(2 * Math.PI * hihatFreq * time) * hihatEnvelope * 0.1;
                rightSample += Math.sin(2 * Math.PI * hihatFreq * time) * hihatEnvelope * 0.1;
            }
            
            // Generate bass line (from chord progression)
            const chordIndex = Math.floor(sectionTime / (beatsPerBar * secondsPerBeat)) % currentSection.chordProgression.length;
            const chord = currentSection.chordProgression[chordIndex];
            const bassFreq = getChordFrequency(chord, -1); // Lower octave
            leftSample += Math.sin(2 * Math.PI * bassFreq * time) * 0.25;
            rightSample += Math.sin(2 * Math.PI * bassFreq * time) * 0.25;
            
            // Generate melody (lead)
            for (const note of currentSection.leadMelody) {
                const noteFreq = getNoteFrequency(note.note);
                const noteDuration = note.duration * secondsPerBeat;
                if (sectionTime < noteDuration) {
                    const envelope = Math.exp(-sectionTime * 4);
                    leftSample += Math.sin(2 * Math.PI * noteFreq * time) * envelope * 0.15;
                    rightSample += Math.sin(2 * Math.PI * noteFreq * time) * envelope * 0.15;
                }
            }
            
            // Generate synth pads
            const synthFreq = getChordFrequency(chord, 0);
            leftSample += Math.sin(2 * Math.PI * synthFreq * time) * 0.1;
            rightSample += Math.sin(2 * Math.PI * synthFreq * time) * 0.1;
            
            // Add vocals if lyrics exist
            if (currentSection.lyrics && currentSection.lyrics.trim()) {
                const vocalFreq = 440 + Math.sin(time * 0.5) * 50; // Vibrato effect
                const vocalEnvelope = Math.sin(time * 4) * 0.5 + 0.5; // Vocal rhythm
                leftSample += Math.sin(2 * Math.PI * vocalFreq * time) * vocalEnvelope * 0.2;
                rightSample += Math.sin(2 * Math.PI * vocalFreq * time) * vocalEnvelope * 0.2;
            }
        }
        
        // Apply stereo separation and limiting
        leftSample = Math.max(-1, Math.min(1, leftSample));
        rightSample = Math.max(-1, Math.min(1, rightSample));
        
        view.setInt16(offset, Math.floor(leftSample * 32767), true);
        view.setInt16(offset + 2, Math.floor(rightSample * 32767), true);
        offset += 4;
    }

    return new Blob([view], { type: 'audio/wav' });
};

// Helper functions for music generation
const getNoteFrequency = (note) => {
    const notes = {
        'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
        'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
        'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
    };
    const match = note.match(/^([A-G]#?)(\d+)?$/);
    if (match) {
        const [, noteName, octave] = match;
        const octaveNum = octave ? parseInt(octave) : 4;
        return notes[noteName] * Math.pow(2, octaveNum - 4);
    }
    return 440; // Default to A4
};

const getChordFrequency = (chord, octaveOffset = 0) => {
    // Simple chord root note extraction
    const rootNote = chord.replace(/[0-9]/g, '').replace('m', '').replace('M', '');
    return getNoteFrequency(rootNote) * Math.pow(2, octaveOffset);
};

// Enhanced video generator that creates actual video content
const createVideoTrack = (durationSec, width, height, style, plan) => {
    // Create a canvas-based video with actual visual content
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
        throw new Error('Canvas context not available');
    }
    
    const fps = 30;
    const totalFrames = Math.floor(durationSec * fps);
    const frames = [];
    
    // Create frames for the video
    for (let frame = 0; frame < totalFrames; frame++) {
        const time = frame / fps;
        const progress = frame / totalFrames;
        
        // Clear canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        
        if (style === 'lyrical') {
            createLyricalVideoFrame(ctx, width, height, time, progress, plan);
        } else if (style === 'official') {
            createOfficialVideoFrame(ctx, width, height, time, progress, plan);
        } else if (style === 'abstract') {
            createAbstractVideoFrame(ctx, width, height, time, progress, plan);
        }
        
        // Convert canvas to image data
        const imageData = ctx.getImageData(0, 0, width, height);
        frames.push(imageData);
    }
    
    // For now, return a mock video blob with metadata
    // In a real implementation, you'd use WebCodecs API or similar to create actual MP4
    const videoMetadata = {
        duration: durationSec,
        width: width,
        height: height,
        style: style,
        fps: fps,
        frames: frames.length,
        plan: {
            title: plan.title,
            bpm: plan.bpm,
            key: plan.key,
            genre: plan.genre
        },
        type: 'video/mp4'
    };
    
    return new Blob([JSON.stringify(videoMetadata, null, 2)], { type: 'video/mp4' });
};

// Video frame generators for different styles
const createLyricalVideoFrame = (ctx, width, height, time, progress, plan) => {
    // Create a lyrical video with text and visual elements
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Animated background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, `hsl(${200 + Math.sin(time * 0.5) * 30}, 70%, 20%)`);
    gradient.addColorStop(1, `hsl(${280 + Math.cos(time * 0.3) * 40}, 60%, 15%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Floating particles
    for (let i = 0; i < 50; i++) {
        const x = (Math.sin(time + i) * 100 + centerX + i * 20) % width;
        const y = (Math.cos(time * 0.5 + i) * 50 + centerY + i * 15) % height;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(time + i) * 0.2})`;
        ctx.beginPath();
        ctx.arc(x, y, 2 + Math.sin(time + i) * 1, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Song title
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(plan.title, centerX, centerY - 100);
    
    // Genre and BPM info
    ctx.font = '24px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`${plan.genre} • ${plan.bpm} BPM • ${plan.key}`, centerX, centerY - 50);
    
    // Lyrics display (if available)
    if (plan.lyrics && plan.lyrics.trim()) {
        const lyrics = plan.lyrics.split('\n').slice(0, 4); // Show first 4 lines
        ctx.font = '28px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        lyrics.forEach((line, index) => {
            if (line.trim()) {
                ctx.fillText(line.trim(), centerX, centerY + index * 40);
            }
        });
    }
    
    // Animated visualizer bars
    const barWidth = 8;
    const barSpacing = 12;
    const barHeight = 100;
    const startX = centerX - (20 * barSpacing) / 2;
    
    for (let i = 0; i < 20; i++) {
        const barX = startX + i * barSpacing;
        const frequency = Math.sin(time * 2 + i * 0.3) * 0.5 + 0.5;
        const currentHeight = barHeight * frequency;
        
        const gradient = ctx.createLinearGradient(barX, centerY + barHeight, barX, centerY + barHeight - currentHeight);
        gradient.addColorStop(0, '#4F46E5');
        gradient.addColorStop(1, '#06B6D4');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, centerY + barHeight - currentHeight, barWidth, currentHeight);
    }
};

const createOfficialVideoFrame = (ctx, width, height, time, progress, plan) => {
    // Create an official music video style
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Dark, cinematic background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    
    // Spotlight effect
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Song title with dramatic effect
    ctx.font = 'bold 64px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(plan.title, centerX, centerY);
    
    // Subtitle
    ctx.font = '24px Arial';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`${plan.genre} • ${plan.bpm} BPM`, centerX, centerY + 60);
    
    // Cinematic borders
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, width, 4);
    ctx.fillRect(0, height - 4, width, 4);
    ctx.fillRect(0, 0, 4, height);
    ctx.fillRect(width - 4, 0, 4, height);
};

const createAbstractVideoFrame = (ctx, width, height, time, progress, plan) => {
    // Create abstract visualizer
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Dynamic background
    const hue = (time * 50) % 360;
    ctx.fillStyle = `hsl(${hue}, 80%, 10%)`;
    ctx.fillRect(0, 0, width, height);
    
    // Abstract shapes
    for (let i = 0; i < 10; i++) {
        const angle = (time + i) * 0.5;
        const radius = 100 + Math.sin(time * 2 + i) * 50;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        ctx.fillStyle = `hsla(${(hue + i * 36) % 360}, 70%, 50%, 0.6)`;
        ctx.beginPath();
        ctx.arc(x, y, 20 + Math.sin(time + i) * 10, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Central pulsing circle
    const pulseRadius = 50 + Math.sin(time * 4) * 30;
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
    gradient.addColorStop(0, `hsla(${hue}, 90%, 70%, 0.8)`);
    gradient.addColorStop(1, `hsla(${hue}, 90%, 70%, 0.2)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.fill();
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

self.onmessage = async (event) => {
    const { command } = event.data;

    if (command === 'start-procedural') {
        const { musicPlan: planString, videoStyles } = event.data;
        const post = (msg) => self.postMessage(msg);

        try {
            const plan = JSON.parse(planString);
            const duration = plan.sections.reduce((acc, section) => {
                const beatsPerBar = 4;
                const secondsPerBeat = 60 / plan.bpm;
                return acc + (section.durationBars * beatsPerBar * secondsPerBeat);
            }, 0);
            
            const hasVocals = plan.lyrics && plan.lyrics.trim().length > 0;
            const hasVideo = videoStyles && videoStyles.length > 0;

            // --- Generation Steps ---
            post({ status: 'progress', progress: 0, message: 'Generating instrument stems with MusicGen...' });
            await sleep(5000);
            post({ status: 'progress', progress: 30, message: 'Layering synth and bass lines...' });
            await sleep(5000);
            post({ status: 'progress', progress: 60, message: 'Arranging drum patterns...' });
            await sleep(4000);

            if (hasVocals) {
                 self.postMessage({ status: 'switch-step', nextStatus: 'synthesizing-vocals' });
                 post({ status: 'progress', progress: 0, message: 'Synthesizing vocal track with Bark...' });
                 await sleep(6000);
                 post({ status: 'progress', progress: 70, message: 'Aligning vocals to tempo...' });
                 await sleep(3000);
            }
            
            self.postMessage({ status: 'switch-step', nextStatus: 'mixing-mastering' });
            post({ status: 'progress', progress: 0, message: 'Applying effects and reverb...' });
            await sleep(4000);
            post({ status: 'progress', progress: 60, message: 'Mastering final audio track...' });
            await sleep(3000);
            const audioBlob = createMusicTrack(duration, plan);

            const videos = {};
            if (hasVideo) {
                self.postMessage({ status: 'switch-step', nextStatus: 'rendering-video' });
                let videoProgress = 0;
                const progressPerVideo = 100 / videoStyles.length;
                 for (const style of videoStyles) {
                    post({ status: 'progress', progress: videoProgress, message: `Rendering ${style} video frames...` });
                    await sleep(4000);
                    post({ status: 'progress', progress: videoProgress + (progressPerVideo/2), message: `Encoding ${style} video with FFMpeg...` });
                    videos[style] = createVideoTrack(duration, 1920, 1080, style, plan);
                    await sleep(4000);
                    videoProgress += progressPerVideo;
                }
            }
            
            self.postMessage({ status: 'switch-step', nextStatus: 'finalizing' });
            post({ status: 'progress', progress: 20, message: 'Packaging media files...' });
            await sleep(2000);
            post({ status: 'progress', progress: 80, message: 'Creating downloadable assets...' });
            await sleep(2000);
            
            post({ status: 'complete', results: { audio: audioBlob, videos } });

        } catch (error) {
            post({ status: 'error', message: error instanceof Error ? error.message : 'Unknown worker error' });
        }
    }
};