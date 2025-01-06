/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('project_markets', (table) => {
    table.integer('project_id').unsigned().notNullable() // FK to projects
    table.integer('market_id').unsigned().notNullable() // FK to markets
    table.timestamp('created_at').defaultTo(knex.fn.now()) // Creation timestamp

    table
      .foreign('project_id')
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE') // Cascade delete if project is deleted

    table
      .foreign('market_id')
      .references('id')
      .inTable('markets')
      .onDelete('CASCADE') // Cascade delete if market is deleted

    table.primary(['project_id', 'market_id']) // Composite primary key
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable('project_markets')
}
