export interface Song {
  id: number;
  title: string;
  artist: string;
  artistId: number;
  album: string;
  year: number | null;
  genre: string;
  language: string;
  energy: number;
  popularity: number;
  moods: string[];
  artworkUrl: string | null;
  previewUrl: string | null;
  emergingArtist: boolean;
  saved: boolean;
  links: { spotify: string; youtube: string; apple: string };
}

export interface MiniUser {
  id: number;
  username: string;
  displayName: string;
  avatar: string | null;
  isDemo: boolean;
  isGuest: boolean;
  bio?: string;
  following?: boolean;
  isMe?: boolean;
  shared?: string[];
  followers?: number;
}

export interface Mood {
  id?: number;
  name: string;
  c1: string;
  c2: string;
  line?: string;
  custom?: boolean;
  drops?: number;
  recent?: number;
}

export interface Drop {
  id: number;
  caption: string;
  background: string;
  source: string;
  featured: boolean;
  createdAt: string;
  mood: Mood;
  room: { slug: string; name: string } | null;
  author: MiniUser & { following: boolean };
  song: Song;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  mine: boolean;
}

export interface Comment {
  id: number;
  body: string;
  createdAt: string;
  author: MiniUser;
  mine: boolean;
}

export interface Room {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  c1: string;
  c2: string;
  motif: string;
  moods: string[];
  memberCount: number;
  dropCount: number;
  joined: boolean;
}

export interface Playlist {
  id: number;
  title: string;
  description: string;
  mood: string;
  source: string;
  owner: string | null;
  mine: boolean;
  songCount: number;
  cover: Song[];
  createdAt: string;
  songs?: { song: Song; reason: string }[];
}

export interface Preferences {
  languages: string[];
  genres: string[];
  artists: string[];
  moods: string[];
  discovery: string[];
}

export interface Me extends MiniUser {
  email: string;
  bio: string;
  currentMood: string | null;
  isPrivate: boolean;
  showSaved: boolean;
  onboarded: boolean;
  notifPrefs: { likes: boolean; comments: boolean; follows: boolean };
  linkService: 'spotify' | 'youtube' | 'apple';
  preferences: Preferences;
  unread: number;
}

export interface SoundOfMe {
  ready: boolean;
  archetype: string;
  summary: string;
  moods: string[];
  genres: string[];
  languages: string[];
  artists: string[];
  energy: number;
  traits: { label: string; value: number }[];
}

export interface Profile extends MiniUser {
  bio: string;
  joinedAt: string;
  isPrivate: boolean;
  isMe: boolean;
  following: boolean;
  followsMe: boolean;
  blockedByMe: boolean;
  canSee: boolean;
  showSaved: boolean;
  followers: number;
  followingCount: number;
  dropCount: number;
  currentMood: Mood | null;
  favouriteArtists: string[];
  favouriteGenres: string[];
  languages: string[];
  soundOfMe: SoundOfMe | null;
  rooms: Room[];
}

export interface Pick {
  song: Song;
  reason: string;
}

export interface AiMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  quickReplies?: string[];
  recommendations?: Pick[];
  playlist?: { title: string; description: string; mood: string; songs: Pick[] };
  suggestedCaption?: string;
  detected?: { mood?: string; blend?: string; energy?: string; intensity?: string; situation?: string };
  engine?: string;
}

export interface Notification {
  id: number;
  type: 'like' | 'comment' | 'follow' | 'welcome';
  body: string;
  read: boolean;
  dropId: number | null;
  songTitle: string | null;
  createdAt: string;
  actor: MiniUser | null;
}
