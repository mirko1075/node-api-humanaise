/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('services', (table) => {
    table.increments('id').primary() // Primary key
    table.string('name', 255).notNullable() // Service name
    table.text('description') // Service description
    table.boolean('is_active').defaultTo(true) // Is the service active?
    table.timestamp('created_at').defaultTo(knex.fn.now()) // Creation timestamp
    table.timestamp('updated_at').defaultTo(knex.fn.now()) // Update timestamp
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable('services')
}
