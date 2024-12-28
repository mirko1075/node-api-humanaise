/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
export const up = async function(knex) {
  await knex.schema.createTable('organization_members', function(table) {
    table.increments('id').primary(); // Auto-incrementing primary key
    table.integer('user_id').unsigned().notNullable(); // Foreign key to users table
    table.integer('organization_id').unsigned().notNullable(); // Foreign key to organizations table
    table.timestamp('created_at').defaultTo(knex.fn.now()); // Timestamp for creation
    table.timestamp('updated_at').defaultTo(knex.fn.now()); // Timestamp for updates

    // Foreign key constraints
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');

    // Unique constraint to prevent duplicate memberships
    table.unique(['user_id', 'organization_id']);
  });
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
export const down = async function(knex) {
  await knex.schema.dropTableIfExists('organization_members');
};
