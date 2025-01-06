/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('projects', (table) => {
    table.increments('id').primary() // Primary key
    table.integer('organization_id').unsigned().notNullable() // FK to organizations
    table.integer('created_by').unsigned().notNullable() // FK to users
    table.string('name', 255).notNullable() // Project name
    table.text('description').nullable() // Project description
    table.string('status', 50).notNullable().defaultTo('draft') // Project status
    table.date('start_date').nullable() // Start date
    table.date('end_date').nullable() // End date
    table.timestamp('created_at').defaultTo(knex.fn.now()) // Creation timestamp
    table.timestamp('updated_at').defaultTo(knex.fn.now()) // Update timestamp

    table
      .foreign('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE') // Cascade delete if organization is deleted

    table
      .foreign('created_by')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL') // Set creator to NULL if user is deleted
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable('projects')
}
