-- Campus Buddies Database Schema
-- Cloudflare D1 (SQLite) Schema

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  city TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  registration_url TEXT NOT NULL,
  qr_code_url TEXT NOT NULL,
  admin_url TEXT NOT NULL,
  display_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Create index on campaigns status and expiration
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_expires ON campaigns(expires_at);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  arrival_year INTEGER NOT NULL,
  hobbies TEXT NOT NULL, -- JSON array string
  status TEXT NOT NULL DEFAULT 'PENDING',
  registered_at INTEGER NOT NULL,
  consent_given INTEGER NOT NULL DEFAULT 0, -- 0 or 1
  consent_timestamp INTEGER NOT NULL,
  privacy_notice_version TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Create index on students campaign and status
CREATE INDEX IF NOT EXISTS idx_students_campaign ON students(campaign_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_campaign_status ON students(campaign_id, status);

-- Create matching_rounds table
CREATE TABLE IF NOT EXISTS matching_rounds (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  configured_at INTEGER NOT NULL,
  completed_at INTEGER,
  old_to_new_ratio TEXT NOT NULL, -- e.g., "1:1", "1:2"
  new_to_new_group_size INTEGER NOT NULL,
  total_matches INTEGER NOT NULL DEFAULT 0,
  total_students_matched INTEGER NOT NULL DEFAULT 0,
  total_students_pending INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Create index on matching_rounds
CREATE INDEX IF NOT EXISTS idx_matching_rounds_campaign ON matching_rounds(campaign_id);
CREATE INDEX IF NOT EXISTS idx_matching_rounds_status ON matching_rounds(status);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  matching_round_id TEXT NOT NULL,
  compatibility_score INTEGER NOT NULL, -- 0-100
  nickname_theme TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (matching_round_id) REFERENCES matching_rounds(id) ON DELETE CASCADE
);

-- Create index on matches
CREATE INDEX IF NOT EXISTS idx_matches_campaign ON matches(campaign_id);
CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(matching_round_id);

-- Create match_members table
CREATE TABLE IF NOT EXISTS match_members (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Create index on match_members
CREATE INDEX IF NOT EXISTS idx_match_members_match ON match_members(match_id);
CREATE INDEX IF NOT EXISTS idx_match_members_student ON match_members(student_id);

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  student_id TEXT, -- NULL if not associated with a specific student
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Create index on push_subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_campaign ON push_subscriptions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_student ON push_subscriptions(student_id);

-- Create admin_sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Create index on admin_sessions
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_campaign ON admin_sessions(campaign_id);

-- Create result_tokens table
CREATE TABLE IF NOT EXISTS result_tokens (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Create index on result_tokens
CREATE INDEX IF NOT EXISTS idx_result_tokens_token ON result_tokens(token);
CREATE INDEX IF NOT EXISTS idx_result_tokens_campaign ON result_tokens(campaign_id);
CREATE INDEX IF NOT EXISTS idx_result_tokens_student ON result_tokens(student_id);

-- Create matching_snapshots table
CREATE TABLE IF NOT EXISTS matching_snapshots (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  matching_round_id TEXT NOT NULL,
  student_ids TEXT NOT NULL, -- JSON array string
  created_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (matching_round_id) REFERENCES matching_rounds(id) ON DELETE CASCADE
);

-- Create index on matching_snapshots
CREATE INDEX IF NOT EXISTS idx_matching_snapshots_round ON matching_snapshots(matching_round_id);

-- Create a view for dashboard statistics
CREATE VIEW IF NOT EXISTS dashboard_stats AS
SELECT 
  c.id as campaign_id,
  c.city,
  c.status,
  c.created_at,
  c.expires_at,
  (SELECT COUNT(*) FROM students WHERE campaign_id = c.id) as total_registered,
  (SELECT COUNT(*) FROM students WHERE campaign_id = c.id AND status = 'MATCHED') as total_matched,
  (SELECT COUNT(*) FROM students WHERE campaign_id = c.id AND status = 'PENDING') as total_pending,
  (SELECT COUNT(*) FROM matching_rounds WHERE campaign_id = c.id) as total_rounds
FROM campaigns c;

-- Create a trigger to update campaign status on expiration
-- Note: SQLite doesn't support triggers that modify the same table, so we'll handle this in the application

-- Create a trigger to update student status when campaign expires
-- This is handled by the expiration cleanup job
