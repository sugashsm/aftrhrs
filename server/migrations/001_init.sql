-- AFTRHRS initial schema

CREATE TABLE moods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  color1 TEXT NOT NULL,
  color2 TEXT NOT NULL,
  energy REAL NOT NULL DEFAULT 3,
  tagline TEXT NOT NULL DEFAULT '',
  is_custom INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar TEXT,
  current_mood_id INTEGER REFERENCES moods(id) ON DELETE SET NULL,
  -- 0 = real account, 1 = seeded fictional demo user, 2 = temporary guest created by "demo mode"
  is_demo INTEGER NOT NULL DEFAULT 0,
  is_private INTEGER NOT NULL DEFAULT 0,
  show_saved INTEGER NOT NULL DEFAULT 1,
  onboarded INTEGER NOT NULL DEFAULT 0,
  notif_prefs TEXT NOT NULL DEFAULT '{"likes":true,"comments":true,"follows":true}',
  link_service TEXT NOT NULL DEFAULT 'spotify',
  created_at TEXT NOT NULL
);

CREATE TABLE user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  languages TEXT NOT NULL DEFAULT '[]',
  genres TEXT NOT NULL DEFAULT '[]',
  artists TEXT NOT NULL DEFAULT '[]',
  moods TEXT NOT NULL DEFAULT '[]',
  discovery TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);

CREATE TABLE artists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_emerging INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  album TEXT NOT NULL DEFAULT '',
  year INTEGER,
  genre TEXT NOT NULL,
  language TEXT NOT NULL,
  energy INTEGER NOT NULL DEFAULT 3,
  popularity INTEGER NOT NULL DEFAULT 50,
  artwork_url TEXT,
  preview_url TEXT,
  apple_url TEXT,
  -- 0 = not looked up, 1 = matched, 2 = looked up without a confident match
  enriched INTEGER NOT NULL DEFAULT 0,
  UNIQUE (title, artist_id)
);
CREATE INDEX idx_songs_genre ON songs(genre);
CREATE INDEX idx_songs_language ON songs(language);

CREATE TABLE song_moods (
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  mood_id INTEGER NOT NULL REFERENCES moods(id) ON DELETE CASCADE,
  PRIMARY KEY (song_id, mood_id)
);

CREATE TABLE sound_rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  color1 TEXT NOT NULL,
  color2 TEXT NOT NULL,
  motif TEXT NOT NULL DEFAULT 'rings',
  mood_tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE room_memberships (
  room_id INTEGER NOT NULL REFERENCES sound_rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE room_songs (
  room_id INTEGER NOT NULL REFERENCES sound_rooms(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (room_id, song_id)
);

CREATE TABLE room_discussions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES sound_rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_discussions_room ON room_discussions(room_id, created_at);

CREATE TABLE mood_drops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  mood_id INTEGER NOT NULL REFERENCES moods(id),
  caption TEXT NOT NULL,
  background TEXT NOT NULL DEFAULT 'dusk',
  room_id INTEGER REFERENCES sound_rooms(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'user', -- 'user' | 'ai' (started from a Mood AI recommendation)
  is_featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_drops_created ON mood_drops(created_at);
CREATE INDEX idx_drops_user ON mood_drops(user_id);
CREATE INDEX idx_drops_room ON mood_drops(room_id);

CREATE TABLE likes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drop_id INTEGER NOT NULL REFERENCES mood_drops(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, drop_id)
);
CREATE INDEX idx_likes_drop ON likes(drop_id);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  drop_id INTEGER NOT NULL REFERENCES mood_drops(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_comments_drop ON comments(drop_id, created_at);

CREATE TABLE saved_posts (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drop_id INTEGER NOT NULL REFERENCES mood_drops(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, drop_id)
);

CREATE TABLE saved_music (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, song_id)
);

CREATE TABLE follows (
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX idx_follows_following ON follows(following_id);

CREATE TABLE blocks (
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drop_id INTEGER NOT NULL REFERENCES mood_drops(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (reporter_id, drop_id)
);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- like | comment | follow | welcome
  drop_id INTEGER REFERENCES mood_drops(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at);

CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL = curated by AFTRHRS
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  mood TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'curated', -- curated | ai | user
  created_at TEXT NOT NULL
);

CREATE TABLE playlist_songs (
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (playlist_id, song_id)
);

CREATE TABLE conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  style TEXT NOT NULL DEFAULT 'casual',
  state TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE conversation_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user | assistant
  content TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX idx_messages_conversation ON conversation_messages(conversation_id, id);
