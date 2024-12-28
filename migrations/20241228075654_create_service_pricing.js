/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('service_pricing', (table) => {
      table.increments('id').primary();
      table.string('service').notNullable(); // e.g., "transcription", "translation"
      table.string('model').notNullable(); // e.g., "transcription", "translation"
      table.decimal('price_per_token', 10, 6).defaultTo(0); // Cost per token
      table.decimal('price_per_minute', 10, 2).defaultTo(0); // Cost per audio minute
      table.string('unit').notNullable(); // Add unit column
      table.string('provider').notNullable().defaultTo('OpenAI'); // Add provider column
      table.timestamps(true, true); // created_at and updated_at
  });
}

/**
* @param { import("knex").Knex } knex
* @returns { Promise<void> }
*/
export async function down(knex) {
  await knex.schema.dropTable('service_pricing');
}
