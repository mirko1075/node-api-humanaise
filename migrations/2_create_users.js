/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary() // Primary key
    table.integer('organization_id').unsigned().notNullable() // FK to organizations
    table.string('email', 255).notNullable().unique() // Unique email
    table.text('password_hash').notNullable() // Hashed password
    table.string('role', 50).defaultTo('viewer') // Default role
    table.boolean('is_active').defaultTo(true) // Is the user active?
    table.timestamp('created_at').defaultTo(knex.fn.now()) // Creation timestamp
    table.timestamp('updated_at').defaultTo(knex.fn.now()) // Update timestamp
    table.timestamp('deleted_at').nullable() // Soft delete timestamp

    table
      .foreign('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE') // Delete users if their organization is deleted
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable('users')
}
