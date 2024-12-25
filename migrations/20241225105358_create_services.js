/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('services', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.integer('organization_id').unsigned().references('id').inTable('organizations').onDelete('CASCADE');
    table.timestamps(true, true);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('services');
}
