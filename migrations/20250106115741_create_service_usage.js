/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('service_usage', (table) => {
    table.increments('id').primary() // Primary key
    table
      .integer('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE') // FK to organizations
    table
      .integer('user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL') // FK to users, nullable for anonymous usage
    table.string('service', 255).notNullable() // Service type
    table.integer('tokens_used').nullable() // Tokens consumed
    table.float('audio_duration').nullable() // Audio duration in minutes
    table.float('bytes').nullable() // File size in bytes
    table.float('cost').defaultTo(0) // Cost of the service
    table.timestamp('created_at').defaultTo(knex.fn.now()) // Creation timestamp
    table.timestamp('updated_at').defaultTo(knex.fn.now()) // Update timestamp
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('service_usage')
}
