/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
export const seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('organization_members').del();
  await knex('organization_members').insert([
    { id: 1, user_id: 1, organization_id: 1, created_at: new Date(), updated_at: new Date() }
  ]);
};
