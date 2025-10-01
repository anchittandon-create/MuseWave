// A simple sine wave generator for WAV audio
const createSineWave = (durationSec, freq, sampleRate = 44100) => {
    const numSamples = Math.floor(durationSec * sampleRate);
    const buffer = new ArrayBuffer(44 + numSamples * 2); // 44-byte WAV header + 16-bit PCM data
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + numSamples * 2, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (1=PCM)
    view.setUint16(22, 1, true); // NumChannels (1=mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, numSamples * 2, true); // Subchunk2Size

    // PCM data
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        const angle = (i / sampleRate) * freq * 2 * Math.PI;
        const sample = Math.sin(angle) * 32767;
        view.setInt16(offset, sample, true);
        offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
};

// Simple silent video generator placeholder
const createSilentVideo = (durationSec, width, height, text) => {
    const videoDescription = `
Video Placeholder
Duration: ${durationSec}s
Resolution: ${width}x${height}
Style: ${text}
This is a dummy file representing the generated MP4 video.`;
    return new Blob([videoDescription], { type: 'video/mp4' });
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
            const audioBlob = createSineWave(duration, 440);

            const videos = {};
            if (hasVideo) {
                self.postMessage({ status: 'switch-step', nextStatus: 'rendering-video' });
                let videoProgress = 0;
                const progressPerVideo = 100 / videoStyles.length;
                 for (const style of videoStyles) {
                    post({ status: 'progress', progress: videoProgress, message: `Rendering ${style} video frames...` });
                    await sleep(4000);
                    post({ status: 'progress', progress: videoProgress + (progressPerVideo/2), message: `Encoding ${style} video with FFMpeg...` });
                    videos[style] = createSilentVideo(duration, 1920, 1080, style);
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