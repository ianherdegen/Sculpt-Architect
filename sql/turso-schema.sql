-- Turso (SQLite/libSQL) schema for Sculpt Sequences
-- Run with: turso db shell <database-name> < sql/turso-schema.sql

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS magic_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  events TEXT NOT NULL DEFAULT '[]',
  share_id TEXT UNIQUE,
  permissions TEXT NOT NULL DEFAULT '{}',
  venmo_username TEXT,
  profile_photo_url TEXT,
  spotify_playlist_urls TEXT NOT NULL DEFAULT '[]',
  is_banned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS poses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pose_variations (
  id TEXT PRIMARY KEY,
  pose_id TEXT NOT NULL REFERENCES poses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  cue_1 TEXT,
  cue_2 TEXT,
  cue_3 TEXT,
  breath_transition TEXT,
  image_url TEXT,
  transitional_cues TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(pose_id, name)
);

CREATE TABLE IF NOT EXISTS sequences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sections TEXT NOT NULL DEFAULT '[]',
  share_id TEXT UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  published_to_profile INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_share_id ON user_profiles(share_id);
CREATE INDEX IF NOT EXISTS idx_poses_author_id ON poses(author_id);
CREATE INDEX IF NOT EXISTS idx_pose_variations_pose_id ON pose_variations(pose_id);
CREATE INDEX IF NOT EXISTS idx_pose_variations_author_id ON pose_variations(author_id);
CREATE INDEX IF NOT EXISTS idx_sequences_user_id ON sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_sequences_share_id ON sequences(share_id);
CREATE INDEX IF NOT EXISTS idx_magic_tokens_token ON magic_tokens(token);
