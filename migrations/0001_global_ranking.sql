PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, name TEXT NOT NULL DEFAULT '',
  tagline TEXT NOT NULL DEFAULT '', link_id TEXT, hidden INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES profiles(id), stage INTEGER NOT NULL,
  version TEXT NOT NULL, started_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'open'
);
CREATE INDEX IF NOT EXISTS sessions_owner ON game_sessions(profile_id, started_at);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY REFERENCES game_sessions(id), profile_id TEXT NOT NULL REFERENCES profiles(id),
  season TEXT NOT NULL, version TEXT NOT NULL, stage INTEGER NOT NULL,
  score INTEGER NOT NULL, victory INTEGER NOT NULL, minis INTEGER NOT NULL, seconds INTEGER NOT NULL,
  finished_at INTEGER NOT NULL, published INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL, breakdown TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS runs_owner ON runs(profile_id, finished_at DESC);
CREATE TABLE IF NOT EXISTS leaderboard_best (
  profile_id TEXT NOT NULL REFERENCES profiles(id), season TEXT NOT NULL, stage INTEGER NOT NULL,
  run_id TEXT NOT NULL REFERENCES runs(id), score INTEGER NOT NULL, victory INTEGER NOT NULL,
  minis INTEGER NOT NULL, seconds INTEGER NOT NULL, finished_at INTEGER NOT NULL,
  PRIMARY KEY(profile_id, season, stage)
);
CREATE INDEX IF NOT EXISTS best_order ON leaderboard_best(season, stage, score DESC, victory DESC, minis DESC, seconds, finished_at);
CREATE TABLE IF NOT EXISTS promotion_links (
  id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES profiles(id), url TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, UNIQUE(profile_id, url)
);
CREATE TABLE IF NOT EXISTS click_events (
  id TEXT PRIMARY KEY, link_id TEXT NOT NULL REFERENCES promotion_links(id), visitor TEXT NOT NULL,
  day TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS click_unique ON click_events(link_id, day, visitor);
CREATE INDEX IF NOT EXISTS click_expiry ON click_events(created_at);
CREATE TABLE IF NOT EXISTS click_daily (
  link_id TEXT NOT NULL REFERENCES promotion_links(id), day TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0, visitors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(link_id, day)
);
CREATE TRIGGER IF NOT EXISTS aggregate_click AFTER INSERT ON click_events BEGIN
  INSERT INTO click_daily(link_id, day, clicks, visitors)
  VALUES(NEW.link_id, NEW.day, 1, CASE WHEN (SELECT COUNT(*) FROM click_events WHERE link_id=NEW.link_id AND day=NEW.day AND visitor=NEW.visitor)=1 THEN 1 ELSE 0 END)
  ON CONFLICT(link_id, day) DO UPDATE SET clicks=clicks+1, visitors=visitors+excluded.visitors;
END;
CREATE TABLE IF NOT EXISTS rate_limits (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS rate_expiry ON rate_limits(expires_at);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY, profile_id TEXT NOT NULL, reporter_hash TEXT NOT NULL,
  reason TEXT NOT NULL, created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open'
);
