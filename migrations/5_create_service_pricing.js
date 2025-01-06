/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('service_pricing', (table) => {
    table.increments('id').primary() // Primary key
    table.integer('organization_id').unsigned().notNullable() // FK to organizations
    table.integer('service_id').unsigned().notNullable() // FK to services
    table.decimal('price', 10, 2).notNullable() // Service price
    table.string('currency', 3).notNullable().defaultTo('USD') // Currency code
    table.boolean('is_active').defaultTo(true) // Is the pricing active?
    table.timestamp('created_at').defaultTo(knex.fn.now()) // Creation timestamp
    table.timestamp('updated_at').defaultTo(knex.fn.now()) // Update timestamp

    table
      .foreign('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE') // Cascade delete with organizations

    table
      .foreign('service_id')
      .references('id')
      .inTable('services')
      .onDelete('CASCADE') // Cascade delete with services
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable('service_pricing')
}
