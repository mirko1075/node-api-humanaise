/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('providers', (table) => {
    table.increments('id').primary() // Primary key
    table.string('name', 255).notNullable().unique() // Provider name
    table.string('website', 255) // Provider website
    table.string('contact_email', 255) // Contact email
    table.timestamp('created_at').defaultTo(knex.fn.now()) // Creation timestamp
    table.timestamp('updated_at').defaultTo(knex.fn.now()) // Update timestamp
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable('providers')
}
