

CREATE TABLE organizations (
  id SERIAL PRIMARY KEY, -- Primary key
  name VARCHAR(255) NOT NULL, -- Organization name
  slug VARCHAR(255) NOT NULL UNIQUE, -- Unique slug for URLs
  description TEXT, -- Organization description
  email VARCHAR(255) NOT NULL, -- Contact email
  phone VARCHAR(15), -- Contact phone number
  address TEXT, -- Address
  subscription_plan VARCHAR(50) DEFAULT 'Free', -- Default subscription plan
  is_active BOOLEAN DEFAULT TRUE, -- Active status
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Creation timestamp
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Update timestamp
  deleted_at TIMESTAMP -- Soft delete timestamp
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  organization_id INT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);
INSERT INTO organizations (name, slug, description, email, phone, address, subscription_plan, is_active, created_at, updated_at) VALUES
  ('PIP', 'Peas in the pod', 'A fictional company.', '', '', '', 'Free', TRUE, NOW(), NOW());
INSERT INTO users (organization_id, email, password_hash, role, is_active, created_at, updated_at) VALUES
  (1, 'mauro@pip.com', 'password', 'admin', TRUE, NOW(), NOW());

CREATE TABLE user_details (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(15),
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  dob DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE providers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  website VARCHAR(255),
  contact_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO providers (id, name, website, contact_email, created_at, updated_at) VALUES
  (1, 'OpenAI', 'https://openai.com', 'info@openai.com', NOW(), NOW()),
  (2, 'Google', 'https://cloud.google.com', 'info@google.com', NOW(), NOW()),
  (3, 'Deepgram', 'https://deepgram.com', 'info@deepgram.com', NOW(), NOW()),
  (4, 'Internal', NULL, NULL, NOW(), NOW());


CREATE TABLE models (
  id SERIAL PRIMARY KEY,
  provider_id INT NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  price_per_minute NUMERIC(10, 4),
  price_per_token NUMERIC(10, 4),
  unit VARCHAR(50),
  priority INTEGER,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);
                                                        ^

INSERT INTO models (id,  provider_id, model_name, description, price_per_minute, price_per_token, unit, priority) VALUES
  (1, 1, 'Whisper', 'OpenAI Whisper for audio transcription.', 0.006, 0.0004, 'minute', 1),
  (2, 2, 'Google STT', 'Google Speech-to-Text for audio transcription.', 0.004, NULL, 'minute', 2),
  (3, 3, 'Deepgram', 'Deepgram for audio transcription.', 0.003, NULL, 'minute', 3),
  (4, 1, 'GPT-4', 'OpenAI GPT-4 for translation.', NULL, 0.0006, 'word', 1),
  (5, 2, 'Google Translate', 'Google Translate for text translation.', NULL, 0.0002, 'word', 2),
  (6, 1, 'GPT-4', 'OpenAI GPT-4 for conversational AI.', NULL, 0.0001, 'token', 1),
  (7, 4, 'FFmpeg', 'Internal FFmpeg for audio processing.', 0.001, NULL, 'minute', 1);

CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  model_id INT REFERENCES models(id) ON DELETE SET NULL,
  provider_id INT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO services (id, name, model_id, provider_id, description, is_active) VALUES 
 (1, 'Transcript with Whisper', 1, 1, 'Transcription service using OpenAI Whisper', TRUE),
 (2, 'Transcript with Google', 2, 2, 'Transcription service using Google STT', TRUE),
 (3, 'Translate with Whisper', 4, 1, 'Translation service using OpenAI GPT-4', TRUE),
 (4, 'Translate with Google', 5, 2, 'Translation service using Google Translate', TRUE),
 (5, 'Chat with Whisper', 6, 1, 'Conversational AI service using OpenAI GPT-4', TRUE),
 (6, 'Audio Processing with FFmpeg', 7, 4, 'Audio processing service using FFmpeg', TRUE);


CREATE TABLE service_pricing (
  id SERIAL PRIMARY KEY,
  organization_id INT NOT NULL,
  service_id INT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

INSERT INTO service_pricing (id, organization_id, service_id, price, currency) VALUES 
  (1, 1, 1, 0.006, 'EUR'), -- OpenAI Whisper
  (2, 1, 1, 0.004, 'EUR'), -- Google STT
  (3, 1, 1, 0.003, 'EUR'), -- Deepgram
  (4, 1, 2, 0.0006, 'EUR'), -- OpenAI GPT-4
  (5, 1, 2, 0.0002, 'EUR'), -- Google Translate
  (6, 1, 3, 0.002, 'EUR'), -- Deepgram
  (7, 1, 4, 0.0001, 'EUR'), -- OpenAI GPT-4 Chat
  (8, 1, 5, 0.001, 'EUR'), -- Internal FFmpeg
  (9, 1, 6, 0.001, 'EUR'); -- Internal FFmpeg


CREATE TABLE markets (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  long_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO markets (slug, long_name, description, created_at, updated_at)
VALUES
  ('us', 'United States', 'Market for the United States', NOW(), NOW()),
  ('uk', 'United Kingdom', 'Market for the United Kingdom', NOW(), NOW()),
  ('fr', 'France', 'Market for France', NOW(), NOW()),
  ('de', 'Germany', 'Market for Germany', NOW(), NOW()),
  ('jp', 'Japan', 'Market for Japan', NOW(), NOW());

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  organization_id INT NOT NULL,
  created_by INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO projects (organization_id, created_by, name, description, status, start_date, end_date) VALUES
  (1, 1, 'Project Alpha', 'Initial market research project.', 'draft', '2025-01-01', '2025-06-01');

CREATE TABLE project_markets (
  project_id INT NOT NULL,
  market_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, market_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE
);


INSERT INTO project_markets (project_id, market_id, created_at)
VALUES
  (1, 1, NOW()), -- Project Alpha -> US
  (1, 2, NOW()); -- Project Alpha -> UK


CREATE TABLE usage_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  market_id INT REFERENCES markets(id) ON DELETE CASCADE,
  service_id INT REFERENCES services(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE service_usage (
  id SERIAL PRIMARY KEY,
  organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  service VARCHAR(255) NOT NULL,
  tokens_used INT,
  audio_duration FLOAT,
  bytes FLOAT,
  cost FLOAT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rename the service column to service_id
ALTER TABLE service_usage
RENAME COLUMN service TO service_id;

-- Change the type of service_id to integer
ALTER TABLE service_usage
ALTER COLUMN service_id TYPE integer USING service_id::integer;


CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  path VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  transcript_status VARCHAR(50) DEFAULT 'pending',
  transcription_file_path VARCHAR(255),
  translation_status VARCHAR(50) DEFAULT 'pending',
  translation_file_path VARCHAR(255),
  organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  market_id INT REFERENCES markets(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transcriptions (
  id SERIAL PRIMARY KEY,
  file_id INT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  service_id INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  transcription_text TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE translations (
  id SERIAL PRIMARY KEY,
  file_id INT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  service_id INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  source_language VARCHAR(10) NOT NULL,
  target_language VARCHAR(10) NOT NULL,
  translation_text TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  file_id INT REFERENCES files(id) ON DELETE CASCADE,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  conversation_text TEXT,
  saved_as_file BOOLEAN DEFAULT FALSE,
  file_path VARCHAR(255),
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE file_metadata (
  id SERIAL PRIMARY KEY,
  file_id INT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  duration FLOAT, -- Duration of audio/video file in seconds
  size BIGINT, -- File size in bytes
  file_type VARCHAR(50), -- MIME type or general file type (e.g., audio/mp3)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for file_id in files table
CREATE INDEX idx_files_file_id ON files (id);

-- Index for user_id in transcriptions table
CREATE INDEX idx_transcriptions_user_id ON transcriptions (user_id);

-- Index for project_id in projects table
CREATE INDEX idx_projects_project_id ON projects (id);

-- Index for service_id in service_usage table
CREATE INDEX idx_service_usage_service_id ON service_usage (service_id);

-- Index for project_id in files table
CREATE INDEX idx_files_project_id ON files (project_id);

--MODIFICATIONS
ALTER TABLE conversations
ADD COLUMN parent_conversation_id INT REFERENCES conversations(id) ON DELETE SET NULL, -- For threading
ADD COLUMN conversation_type VARCHAR(50) DEFAULT 'file_chat'; -- Classification of conversation


ALTER TABLE projects
ADD COLUMN updated_by INT REFERENCES users(id) ON DELETE SET NULL;


ALTER TABLE files
ADD COLUMN created_by INT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN updated_by INT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE transcriptions
ADD COLUMN created_by INT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN updated_by INT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE translations
ADD COLUMN created_by INT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN updated_by INT REFERENCES users(id) ON DELETE SET NULL;


ALTER TABLE files
ADD CONSTRAINT fk_files_project_id
FOREIGN KEY (project_id) REFERENCES projects(id)
ON DELETE CASCADE;

ALTER TABLE files
ADD CONSTRAINT fk_files_organization_id
FOREIGN KEY (organization_id) REFERENCES organizations(id)
ON DELETE CASCADE;

-- Ensure organization_id references organizations
ALTER TABLE service_usage
ADD CONSTRAINT fk_service_usage_organization_id
FOREIGN KEY (organization_id) REFERENCES organizations(id)
ON DELETE CASCADE;

-- Ensure user_id references users (nullable)
ALTER TABLE service_usage
ADD CONSTRAINT fk_service_usage_user_id
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE SET NULL;

-- Ensure service_id references services
ALTER TABLE service_usage
ADD CONSTRAINT fk_service_usage_service_id
FOREIGN KEY (service_id) REFERENCES services(id)
ON DELETE CASCADE;



ALTER TABLE service_usage
ADD COLUMN request_metadata JSONB, -- Stores request details in JSON format
ADD COLUMN response_metadata JSONB, -- Stores response details in JSON format
ADD COLUMN status VARCHAR(50) DEFAULT 'in_progress'; -- Tracks the service's status


ALTER TABLE transcriptions
ADD COLUMN version INT DEFAULT 1; -- Version number for tracking changes

ALTER TABLE translations
ADD COLUMN version INT DEFAULT 1; -- Version number for tracking changes
