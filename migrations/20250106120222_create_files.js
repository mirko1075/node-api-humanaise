/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('files', (table) => {
    table.increments('id').primary() // Primary key
    table.string('name', 255).notNullable() // File name
    table.string('path', 255).notNullable() // File path
    table.string('status', 50).defaultTo('pending') // Status of file processing
    table.string('transcript_status', 50).defaultTo('pending') // Transcription status
    table.string('transcription_file_path', 255).nullable() // Path to transcription file
    table.string('translation_status', 50).defaultTo('pending') // Translation status
    table.string('translation_file_path', 255).nullable() // Path to translation file
    table
      .integer('organization_id')
      .unsigned()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE') // FK to organizations
    table
      .integer('user_id')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE') // FK to users
    table
      .integer('project_id')
      .unsigned()
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE') // FK to projects
    table
      .integer('market_id')
      .unsigned()
      .references('id')
      .inTable('markets')
      .onDelete('SET NULL') // FK to markets
    table.timestamp('created_at').defaultTo(knex.fn.now()) // Creation timestamp
    table.timestamp('updated_at').defaultTo(knex.fn.now()) // Update timestamp
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('files')
}
