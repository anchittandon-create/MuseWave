import React from 'react';

interface AIAudioTranscriptProps {
  lyrics: string;
}

const AIAudioTranscript = ({ lyrics }: AIAudioTranscriptProps) => {
  return (
    <div className="bg-secondary/50 backdrop-blur-sm border border-border rounded-lg p-6 animate-in fade-in duration-300">
      <h3 className="text-lg font-semibold text-white mb-3">Lyrics / Vocal Theme</h3>
      <p className="text-muted-foreground whitespace-pre-wrap">{lyrics}</p>
    </div>
  );
};

export default AIAudioTranscript;