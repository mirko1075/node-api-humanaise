/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  await knex('project_markets').del() // Clear existing data

  await knex('project_markets').insert([
    { project_id: 1, market_id: 1, created_at: new Date() }, // Project Alpha -> US
    { project_id: 1, market_id: 2, created_at: new Date() }, // Project Alpha -> UK
    { project_id: 2, market_id: 3, created_at: new Date() }, // Project Beta -> France
    { project_id: 2, market_id: 4, created_at: new Date() } // Project Beta -> Germany
  ])
}
