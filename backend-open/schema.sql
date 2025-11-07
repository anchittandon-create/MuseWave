CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  payload TEXT,
  bpm INT,
  song_key TEXT,
  mix_url TEXT,
  instrumental_url TEXT,
  vocals_url TEXT,
  video_url TEXT,
  engines TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
