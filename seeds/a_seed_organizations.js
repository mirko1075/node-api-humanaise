/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
export const seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('organizations').del();
  await knex('organizations').insert([
    { id: 1, name: 'PIP', created_at: new Date(), updated_at: new Date() }
  ]);
};
