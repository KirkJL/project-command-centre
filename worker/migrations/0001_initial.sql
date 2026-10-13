-- Fresh installation schema. Back up and reconcile an existing database before applying.
PRAGMA foreign_keys = ON;
CREATE TABLE users (
 id INTEGER PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE,
 display_name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE sessions (
 id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TEXT NOT NULL, csrf_token TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE login_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, window_started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE audit_log (
 id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
 action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, ip_hash TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX audit_user ON audit_log(user_id,id);
CREATE TABLE projects (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL, slug TEXT NOT NULL, description TEXT, project_type TEXT NOT NULL DEFAULT 'custom',
 status TEXT NOT NULL DEFAULT 'active', accent_colour TEXT NOT NULL DEFAULT '#6C63FF',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id,slug)
);
CREATE TABLE brand_groups (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, name TEXT NOT NULL
);
CREATE TABLE content (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT,
 content_type TEXT NOT NULL DEFAULT 'text', status TEXT NOT NULL DEFAULT 'idea',
 brand_group_id INTEGER REFERENCES brand_groups(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX content_owner ON content(user_id,project_id);
CREATE TABLE ideas (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, title TEXT NOT NULL, description TEXT,
 idea_type TEXT, status TEXT NOT NULL DEFAULT 'inbox',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE social_accounts (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE, platform TEXT NOT NULL, platform_user_id TEXT,
 account_name TEXT NOT NULL, account_handle TEXT, status TEXT NOT NULL DEFAULT 'disconnected',
 brand_group_id INTEGER REFERENCES brand_groups(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id,project_id,platform,platform_user_id)
);
CREATE TABLE oauth_states (
 id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 provider TEXT NOT NULL, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 code_verifier TEXT, expires_at TEXT NOT NULL
);
CREATE TABLE oauth_credentials (
 id INTEGER PRIMARY KEY, social_account_id INTEGER NOT NULL UNIQUE REFERENCES social_accounts(id) ON DELETE CASCADE,
 provider TEXT NOT NULL, access_token_encrypted TEXT NOT NULL, refresh_token_encrypted TEXT,
 expires_at TEXT, scope TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE publication_jobs (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 content_id INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
 social_account_id INTEGER NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
 platform TEXT NOT NULL, title TEXT, caption TEXT, description TEXT, publish_state TEXT NOT NULL DEFAULT 'draft',
 scheduled_at TEXT, processing_started_at TEXT, next_attempt_at TEXT, published_at TEXT,
 external_post_id TEXT, external_post_url TEXT, attempt_count INTEGER NOT NULL DEFAULT 0,
 max_attempts INTEGER NOT NULL DEFAULT 3, last_error TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX publication_owner ON publication_jobs(user_id,content_id);
CREATE INDEX publication_queue ON publication_jobs(publish_state,scheduled_at,next_attempt_at);
CREATE TABLE media_uploads (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 content_id INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
 social_account_id INTEGER NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
 publication_job_id INTEGER NOT NULL REFERENCES publication_jobs(id) ON DELETE CASCADE,
 platform TEXT NOT NULL, file_name TEXT, mime_type TEXT, file_size INTEGER NOT NULL,
 upload_state TEXT NOT NULL DEFAULT 'initialising', platform_upload_id TEXT, platform_post_id TEXT, last_error TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE youtube_uploads (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 publication_job_id INTEGER NOT NULL REFERENCES publication_jobs(id) ON DELETE CASCADE,
 social_account_id INTEGER NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
 file_size INTEGER NOT NULL, mime_type TEXT NOT NULL, session_url_encrypted TEXT NOT NULL,
 privacy_status TEXT NOT NULL DEFAULT 'private', bytes_uploaded INTEGER NOT NULL DEFAULT 0,
 upload_state TEXT NOT NULL DEFAULT 'ready', video_id TEXT, last_error TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE publication_metrics (
 id INTEGER PRIMARY KEY, publication_job_id INTEGER NOT NULL REFERENCES publication_jobs(id) ON DELETE CASCADE,
 collected_date TEXT NOT NULL, views INTEGER NOT NULL DEFAULT 0, likes INTEGER NOT NULL DEFAULT 0,
 comments INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(publication_job_id,collected_date)
);
CREATE TABLE recurring_tasks (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, title TEXT NOT NULL,
 priority TEXT NOT NULL DEFAULT 'normal', interval_days INTEGER NOT NULL CHECK(interval_days BETWEEN 1 AND 365),
 next_due_at TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE recurring_task_runs (
 id INTEGER PRIMARY KEY, template_id INTEGER NOT NULL REFERENCES recurring_tasks(id) ON DELETE CASCADE,
 due_at TEXT NOT NULL, task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL, UNIQUE(template_id,due_at)
);
CREATE TABLE tasks (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, title TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('backlog','todo','in_progress','done','cancelled')),
 priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','critical')),
 due_at TEXT, recurrence_run_id INTEGER UNIQUE REFERENCES recurring_task_runs(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX tasks_owner ON tasks(user_id,project_id,status);
CREATE TABLE content_tags (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 content_id INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE, tag TEXT NOT NULL,
 PRIMARY KEY(user_id,content_id,tag)
);
CREATE TABLE content_variants (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 content_id INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
 platform TEXT NOT NULL, title TEXT NOT NULL, caption TEXT, music_reference TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE project_github_repos (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 owner TEXT NOT NULL, repo TEXT NOT NULL, UNIQUE(user_id,project_id,owner,repo)
);
