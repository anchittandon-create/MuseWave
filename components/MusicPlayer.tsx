


import React, { useState, useRef, useEffect } from 'react';
import Button from './ui/Button';
import type { Job, VideoStyle } from '../lib/types';
// FIX: Changed import path to point to .tsx file.
import { cn } from '../lib/utils.tsx';
import Slider from './ui/Slider';

// Icons
const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const PauseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const Music4Icon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><path d="m9 9 12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;

interface MusicPlayerProps {
  job: Job | null;
  audioUrl: string | null;
  videoUrls?: Partial<Record<VideoStyle, string>> | null;
}

const MusicPlayer = ({ job, audioUrl, videoUrls }: MusicPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeVideoStyle, setActiveVideoStyle] = useState<VideoStyle | null>(null);

  const availableVideoStyles = Object.keys(videoUrls || {}) as VideoStyle[];
  const activeVideoUrl = activeVideoStyle ? videoUrls?.[activeVideoStyle] : null;

  // Set initial active video
  useEffect(() => {
    if (availableVideoStyles.length > 0) {
      setActiveVideoStyle(availableVideoStyles[0]);
    } else {
      setActiveVideoStyle(null);
    }
  }, [videoUrls]);


  // Effect to handle audio events, which are the source of truth
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateCurrentTime = () => {
        if (!isNaN(audio.duration)) {
            setCurrentTime(audio.currentTime);
        }
    };
    const setMediaData = () => setDuration(audio.duration);
    const onEnded = () => {
      if (!activeVideoUrl) { // Only stop if not looping with video
          setIsPlaying(false);
          setCurrentTime(0);
      }
    };

    audio.addEventListener('timeupdate', updateCurrentTime);
    audio.addEventListener('loadedmetadata', setMediaData);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateCurrentTime);
      audio.removeEventListener('loadedmetadata', setMediaData);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl, activeVideoUrl]);

  // Effect to reset state when media sources change
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if(audioRef.current) audioRef.current.currentTime = 0;
    if(videoRef.current) videoRef.current.currentTime = 0;
  }, [audioUrl, videoUrls]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio) return;

    const newIsPlaying = !isPlaying;
    if (newIsPlaying) {
        audio.play().catch(console.error);
        if (video) video.play().catch(console.error);
    } else {
        audio.pause();
        if (video) video.pause();
    }
    setIsPlaying(newIsPlaying);
  };
  
  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    const audio = audioRef.current;
    const video = videoRef.current;

    if (!audio || isNaN(audio.duration)) return;

    audio.currentTime = newTime;
    if (video) {
        video.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  if (!job || !audioUrl) return null;

  const musicPlan = job.finalPlan?.plan;

  return (
    <div className="bg-secondary/50 backdrop-blur-sm border border-border rounded-lg p-4 w-full animate-in fade-in duration-300 space-y-4">
      
      {/* Media Elements: Audio is the source of truth */}
      <audio ref={audioRef} src={audioUrl} preload="auto" loop={!!activeVideoUrl} />
      {activeVideoUrl && (
         <video ref={videoRef} src={activeVideoUrl} className="w-full rounded-md aspect-video bg-black" muted loop playsInline key={activeVideoStyle} />
      )}
       {availableVideoStyles.length > 1 && (
        <div className="flex items-center justify-center gap-2 rounded-md bg-muted p-1">
          {availableVideoStyles.map((style) => (
            <Button
              key={style}
              onClick={() => setActiveVideoStyle(style)}
              variant={activeVideoStyle === style ? 'default' : 'ghost'}
              className={cn("capitalize flex-1", activeVideoStyle === style ? 'bg-primary' : '')}
            >
              {style}
            </Button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button onClick={togglePlayPause} size="icon" variant="ghost">
          {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
        </Button>
        <div className="flex-1 flex flex-col gap-2">
            <div>
                <span className="font-medium">{musicPlan?.title || "Generated Track"}</span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{musicPlan?.bpm || '---'} BPM</span>
                    <span>{musicPlan?.key || '---'}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono w-10 text-center">{formatTime(currentTime)}</span>
                <Slider
                    value={[currentTime]}
                    onValueChange={handleSeek}
                    max={duration || 1}
                    step={0.1}
                    disabled={!audioUrl || duration === 0}
                />
                <span className="text-xs text-muted-foreground font-mono w-10 text-center">{formatTime(duration)}</span>
            </div>
        </div>
      </div>
      
      <div className="border-t border-border/50 pt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
         <a href={audioUrl} download={`${musicPlan?.title || 'museforge-track'}.wav`} className="flex-1">
            <Button variant="outline" className="w-full">
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download Audio
            </Button>
        </a>
        <Button variant="outline" className="w-full" disabled>
            <Music4Icon className="h-4 w-4 mr-2" />
            Download Stems
        </Button>
      </div>

       {availableVideoStyles.length > 0 && (
        <div className="border-t border-border/50 pt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
            {availableVideoStyles.map(style => (
                 <a key={style} href={videoUrls?.[style]} download={`${musicPlan?.title || 'museforge-video'}-${style}.mp4`} className="w-full block">
                    <Button variant="outline" className="w-full capitalize">
                        <DownloadIcon className="h-4 w-4 mr-2" />
                        Download {style} Video
                    </Button>
                </a>
            ))}
        </div>
       )}
    </div>
  );
};

export default MusicPlayer;