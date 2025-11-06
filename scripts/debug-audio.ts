import { audioSynthService } from '../backend/src/services/audioSynthService.ts';
import { videoService } from '../backend/src/services/videoService.ts';
import { promises as fs } from 'fs';
import path from 'path';

async function main() {
  const outDir = path.join(process.cwd(), 'tmp-debug');
  await fs.mkdir(outDir, { recursive: true });

  const plan = {
    bpm: 120,
    key: 'A minor',
    structure: [
      { section: 'intro', duration: 8 },
      { section: 'verse', duration: 16 },
      { section: 'chorus', duration: 16 },
    ],
  } as any;

  const audioOut = path.join(outDir, 'mix.wav');
  await audioSynthService.synthesize(plan, 60, audioOut);
  console.log('Audio generated:', audioOut);

  const videoOut = path.join(outDir, 'video.mp4');
  await videoService.generateVideo(audioOut, { bpm: 120, structure: plan.structure }, videoOut, ['Abstract Visualizer']);
  console.log('Video generated:', videoOut);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
