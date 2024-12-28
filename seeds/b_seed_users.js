/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
export const seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del();
  await knex('users').insert([
    {
      id: 1,
      name: 'Mauro Morando',
      email: 'mauro.morando@example.com',
      password: '$2b$10$CwTycUXWue0Thq9StjUM0uJ6kJJlsc9TXU3bzRE5y7qD6ytubNknG', // bcrypt hashed password (e.g., 'password')
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
};
