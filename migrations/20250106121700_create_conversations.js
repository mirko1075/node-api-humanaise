/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('conversations', (table) => {
    table.increments('id').primary() // Primary key
    table
      .integer('file_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('files')
      .onDelete('CASCADE') // FK to files
    table
      .integer('project_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE') // FK to projects
    table.string('type', 50).notNullable() // Type of conversation
    table.text('conversation_text').nullable() // Full conversation text
    table.boolean('saved_as_file').defaultTo(false) // Whether saved as a file
    table.string('file_path', 255).nullable() // Path to saved file
    table
      .integer('created_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL') // FK to users
    table.timestamp('created_at').defaultTo(knex.fn.now()) // Creation timestamp
    table.timestamp('updated_at').defaultTo(knex.fn.now()) // Update timestamp
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('conversations')
}
