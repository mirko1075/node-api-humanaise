/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  await knex('markets').del() // Clear existing data

  await knex('markets').insert([
    {
      slug: 'us',
      long_name: 'United States',
      description: 'Market for the United States',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      slug: 'uk',
      long_name: 'United Kingdom',
      description: 'Market for the United Kingdom',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      slug: 'fr',
      long_name: 'France',
      description: 'Market for France',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      slug: 'de',
      long_name: 'Germany',
      description: 'Market for Germany',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      slug: 'jp',
      long_name: 'Japan',
      description: 'Market for Japan',
      created_at: new Date(),
      updated_at: new Date()
    }
  ])
}
