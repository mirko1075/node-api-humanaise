/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('user_details', (table) => {
    table.increments('id').primary() // Primary key
    table.integer('user_id').unsigned().notNullable() // FK to users
    table.string('first_name', 255).notNullable() // First name
    table.string('last_name', 255).notNullable() // Last name
    table.string('phone', 15) // Phone number
    table.text('address_line1') // Address line 1
    table.text('address_line2') // Address line 2
    table.string('city', 100) // City
    table.string('state', 100) // State
    table.string('postal_code', 20) // Postal code
    table.string('country', 100) // Country
    table.date('dob') // Date of birth
    table.timestamp('created_at').defaultTo(knex.fn.now()) // Creation timestamp
    table.timestamp('updated_at').defaultTo(knex.fn.now()) // Update timestamp

    table
      .foreign('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE') // Delete details if the user is deleted
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable('user_details')
}
