/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('markets', (table) => {
    table.increments('id').primary() // Primary key
    table.string('slug', 50).notNullable().unique() // Unique market slug
    table.string('long_name', 255).notNullable() // Full market name
    table.text('description').nullable() // Optional description
    table.timestamp('created_at').defaultTo(knex.fn.now()) // Creation timestamp
    table.timestamp('updated_at').defaultTo(knex.fn.now()) // Update timestamp
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable('markets')
}
