/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  await knex('providers').del() // Clear existing data

  await knex('providers').insert([
    {
      id: 1,
      name: 'OpenAI',
      website: 'https://openai.com',
      contact_email: 'support@openai.com',
      priority: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'Google',
      website: 'https://cloud.google.com',
      contact_email: 'support@google.com',
      priority: 2,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      name: 'Deepgram',
      website: 'https://deepgram.com',
      contact_email: 'support@deepgram.com',
      priority: 3,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      name: 'Internal',
      website: null,
      contact_email: null,
      priority: 4,
      created_at: new Date(),
      updated_at: new Date()
    }
  ])
}
