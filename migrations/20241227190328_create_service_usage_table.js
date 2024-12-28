/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('service_usage', (table) => {
      table.increments('id').primary();
      table.integer('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
      table.integer('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('service').notNullable(); // e.g., 'translation', 'transcription'
      table.integer('tokens_used').nullable(); // For GPT services
      table.float('audio_duration').nullable(); // For Whisper or similar services
      table.float('bytes').nullable(); // For File processing
      table.float('cost').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now()); // Colonna mancante
      table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

/**
* @param { import("knex").Knex } knex
* @returns { Promise<void> }
*/
export function down(knex) {
  return knex.schema.dropTable('service_usage');
}
