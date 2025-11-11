from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, HttpUrl


class PromptRequest(BaseModel):
  prompt: str = Field(..., description="User provided prompt or idea")
  genres: List[str] = Field(default_factory=list)
  mood: Optional[str] = None
  language: Optional[str] = None


class PromptResponse(BaseModel):
  id: str
  title: str
  lyrics: str
  genre: str
  mood: str
  language: str
  artist_inspiration: Optional[str] = None
  created_at: datetime


class AudioRequest(BaseModel):
  prompt_id: str
  prompt: str
  genre: str
  mood: Optional[str] = None
  seed: Optional[int] = None


class AudioResponse(BaseModel):
  id: str
  instrumental_url: HttpUrl
  created_at: datetime


class VocalRequest(BaseModel):
  audio_id: str
  lyrics: str
  language: Optional[str] = 'English'
  voice_style: Optional[str] = 'neutral'


class VocalResponse(BaseModel):
  id: str
  vocals_url: HttpUrl
  created_at: datetime


class FinalRequest(BaseModel):
  audio_id: str
  vocal_id: str
  project_id: Optional[str] = None


class FinalResponse(BaseModel):
  id: str
  prompt: str
  lyrics: str
  genre: str
  language: str
  artist_inspiration: Optional[str] = None
  mood: Optional[str] = None
  instrumental_url: HttpUrl
  vocals_url: HttpUrl
  mix_url: HttpUrl
  video_url: HttpUrl
  created_at: datetime


class SuggestRequest(BaseModel):
  field: Literal['genres', 'languages', 'artists', 'moods']
  input: str = ''
  context: dict = Field(default_factory=dict)


class SuggestResponse(BaseModel):
  suggestions: List[str]
