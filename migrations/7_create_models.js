/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('models', (table) => {
    table.increments('id').primary() // Primary key
    table.integer('service_id').unsigned().notNullable() // FK to services
    table.integer('provider_id').unsigned().notNullable() // FK to providers
    table.string('model_name', 255).notNullable() // Model name
    table.text('description').nullable() // Model description
    table.decimal('price_per_minute', 10, 4).nullable() // Price per minute
    table.decimal('price_per_token', 10, 4).nullable() // Price per token
    table.string('unit', 50).notNullable() // Unit of measurement
    table.integer('priority').defaultTo(1) // Priority for selection
    table.timestamp('created_at').defaultTo(knex.fn.now()) // Creation timestamp
    table.timestamp('updated_at').defaultTo(knex.fn.now()) // Update timestamp

    table
      .foreign('service_id')
      .references('id')
      .inTable('services')
      .onDelete('CASCADE') // Cascade delete if service is deleted

    table
      .foreign('provider_id')
      .references('id')
      .inTable('providers')
      .onDelete('CASCADE') // Cascade delete if provider is deleted
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable('models')
}
