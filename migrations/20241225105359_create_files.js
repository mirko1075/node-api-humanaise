/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('files', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('path').notNullable();
    table.integer('service_id').unsigned().references('id').inTable('services').onDelete('CASCADE');
    table.string('status').defaultTo('pending');
    table.timestamps(true, true);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('files');
}
