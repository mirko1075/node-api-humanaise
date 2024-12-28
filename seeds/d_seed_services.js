/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
export async function seed(knex) {
  // Clear existing entries
  await knex('services').del();

  // Insert seed entries
  await knex('services').insert([
    {
      id: 1,
      name: 'Transcription',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      name: 'Translation',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 3,
      name: 'Sentiment Analysis',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 4,
      name: 'Summary',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}
