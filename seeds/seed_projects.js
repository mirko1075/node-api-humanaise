/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  await knex('projects').del() // Clear existing data

  await knex('projects').insert([
    {
      organization_id: 1,
      created_by: 1,
      name: 'Project Alpha',
      description: 'Initial market research project.',
      status: 'draft',
      start_date: '2025-01-01',
      end_date: '2025-06-01',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      organization_id: 1,
      created_by: 2,
      name: 'Project Beta',
      description: 'Product launch in European markets.',
      status: 'open',
      start_date: '2025-02-01',
      end_date: '2025-08-01',
      created_at: new Date(),
      updated_at: new Date()
    }
  ])
}
