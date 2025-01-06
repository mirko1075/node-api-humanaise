
INSERT INTO providers (id, name, website, contact_email, created_at, updated_at) VALUES
  (1, 'OpenAI', 'https://openai.com', 'info@openai.com', NOW(), NOW()),
  (2, 'Google', 'https://cloud.google.com', 'info@google.com', NOW(), NOW()),
  (3, 'Deepgram', 'https://deepgram.com', 'info@deepgram.com', NOW(), NOW()),
  (4, 'Internal', NULL, NULL, NOW(), NOW());


INSERT INTO service_pricing (id, organization_id, service_id, price, currency)
VALUES
  -- Transcription Services
  (1, 1,  1, 0.006, 'EUR'), -- OpenAI Whisper
  (2, 1, 1, 0.004, 'EUR'), -- Google STT
  (3, 1, 1, 0.003, 'EUR'), -- Deepgram

  -- Translation Services
  (4, 1, 2, 0.0006, 'EUR'), -- OpenAI GPT-4
  (5, 1, 2, 0.0002, 'EUR'), -- Google Translate

  -- Detect Language
  (6, 1, 3, 0.002, 'EUR'), -- Deepgram

  -- Chat Services
  (7, 1, 4, 0.0001, 'EUR'), -- OpenAI GPT-4 Chat

  -- Audio Processing
  (8, 1, 5, 0.001, 'EUR'), -- Internal FFmpeg

  -- File Processing
  (9, 1, 6, 0.001, 'EUR'); -- Internal FFmpeg
