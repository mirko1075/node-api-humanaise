/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('translations', (table) => {
    table.increments('id').primary() // Primary key
    table
      .integer('file_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('files')
      .onDelete('CASCADE') // FK to files
    table
      .integer('service_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('services')
      .onDelete('CASCADE') // FK to services
    table
      .integer('user_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL') // FK to users
    table.string('source_language', 10).notNullable() // Source language
    table.string('target_language', 10).notNullable() // Target language
    table.text('translation_text').nullable() // Translated text
    table.string('status', 50).defaultTo('pending') // Translation status
    table.timestamp('created_at').defaultTo(knex.fn.now()) // Creation timestamp
    table.timestamp('updated_at').defaultTo(knex.fn.now()) // Update timestamp
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('translations')
}
