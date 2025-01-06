/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('transcriptions', (table) => {
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
    table.text('transcription_text').nullable() // Transcribed text
    table.string('status', 50).defaultTo('pending') // Transcription status
    table.timestamp('created_at').defaultTo(knex.fn.now()) // Creation timestamp
    table.timestamp('updated_at').defaultTo(knex.fn.now()) // Update timestamp
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('transcriptions')
}
