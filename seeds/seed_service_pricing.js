export async function seed(knex) {
  await knex('service_pricing').insert([
    // Transcription Services
    {
      id: 1,
      provider: 'OpenAI',
      model: 'Whisper',
      price_per_minute: 0.006,
      price_per_token: 0.0004,
      service: 'Transcription',
      unit: 'minute',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      provider: 'Google',
      model: 'Google STT',
      price_per_minute: 0.004,
      price_per_token: null,
      service: 'Transcription',
      unit: 'minute',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 3,
      provider: 'Deepgram',
      model: 'Deepgram',
      price_per_minute: 0.003,
      price_per_token: null,
      service: 'Transcription',
      unit: 'minute',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 4,
      provider: 'OpenAI',
      model: 'GPT-4',
      price_per_minute: 0.005,
      price_per_token: 0.0006,
      service: 'Translation',
      unit: 'word',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 5,
      provider: 'Google',
      model: 'Google Translate',
      price_per_minute: null,
      price_per_token: 0.0002,
      service: 'Translation',
      unit: 'word',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 6,
      provider: 'Deepgram',
      model: 'Deepgram',
      price_per_minute: 0.002,
      price_per_token: null,
      service: 'Detect Language',
      unit: 'minute',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 7,
      provider: 'OpenAI',
      model: 'GPT-4',
      price_per_minute: null,
      price_per_token: 0.0001,
      service: 'Chat',
      unit: 'token',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 8,
      provider: 'Internal',
      model: 'FFmpeg',
      price_per_minute: 0.001, // Arbitrary price for resource usage
      price_per_token: null,
      service: 'Audio Processing',
      unit: 'minute',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id:9,
      provider: 'Internal',
      model: 'FFmpeg',
      price_per_minute: 0.001, // Arbitrary price for resource usage
      price_per_token: null,
      service: 'File processing',
      unit: 'bytes',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}
