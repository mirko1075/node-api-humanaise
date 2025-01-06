export async function seed(knex) {
  await knex('models').del() // Clear existing data

  await knex('models').insert([
    // Transcription models
    {
      id: 1,
      service_id: 1, // Transcription service
      provider_id: 1, // OpenAI
      model_name: 'Whisper',
      description: 'OpenAI Whisper for audio transcription.',
      price_per_minute: 0.006,
      price_per_token: 0.0004,
      unit: 'minute',
      priority: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      service_id: 1, // Transcription service
      provider_id: 2, // Google
      model_name: 'Google STT',
      description: 'Google Speech-to-Text for audio transcription.',
      price_per_minute: 0.004,
      price_per_token: null,
      unit: 'minute',
      priority: 2,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      service_id: 1, // Transcription service
      provider_id: 3, // Deepgram
      model_name: 'Deepgram',
      description: 'Deepgram for audio transcription.',
      price_per_minute: 0.003,
      price_per_token: null,
      unit: 'minute',
      priority: 3,
      created_at: new Date(),
      updated_at: new Date()
    },
    // Translation models
    {
      id: 4,
      service_id: 2, // Translation service
      provider_id: 1, // OpenAI
      model_name: 'GPT-4',
      description: 'OpenAI GPT-4 for translation.',
      price_per_minute: null,
      price_per_token: 0.0006,
      unit: 'word',
      priority: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      service_id: 2, // Translation service
      provider_id: 2, // Google
      model_name: 'Google Translate',
      description: 'Google Translate for text translation.',
      price_per_minute: null,
      price_per_token: 0.0002,
      unit: 'word',
      priority: 2,
      created_at: new Date(),
      updated_at: new Date()
    },
    // Chat models
    {
      id: 6,
      service_id: 3, // Chat service
      provider_id: 1, // OpenAI
      model_name: 'GPT-4',
      description: 'OpenAI GPT-4 for conversational AI.',
      price_per_minute: null,
      price_per_token: 0.0001,
      unit: 'token',
      priority: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    // Audio processing models
    {
      id: 7,
      service_id: 4, // Audio processing service
      provider_id: 4, // Internal
      model_name: 'FFmpeg',
      description: 'Internal FFmpeg for audio processing.',
      price_per_minute: 0.001,
      price_per_token: null,
      unit: 'minute',
      priority: 1,
      created_at: new Date(),
      updated_at: new Date()
    }
  ])
}
