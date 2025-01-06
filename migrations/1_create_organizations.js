/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('organizations', (table) => {
    table.increments('id').primary() // Primary key
    table.string('name', 255).notNullable() // Organization name
    table.string('slug', 255).notNullable().unique() // Unique slug for URLs
    table.text('description') // Description of the organization
    table.string('email', 255).notNullable() // Contact email
    table.string('phone', 15) // Contact phone number
    table.text('address') // Address
    table.string('subscription_plan', 50).defaultTo('Free') // Default subscription plan
    table.boolean('is_active').defaultTo(true) // Is the organization active?
    table.timestamp('created_at').defaultTo(knex.fn.now()) // Creation timestamp
    table.timestamp('updated_at').defaultTo(knex.fn.now()) // Update timestamp
    table.timestamp('deleted_at').nullable() // Soft delete timestamp
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('organizations')
}
