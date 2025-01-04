/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.alterTable('files', (table) => {
    table.string('transcriptStatus').defaultTo('pending') // 'pending', 'available', 'failed'
    table.string('transcriptionFilePath') // S3 URL for transcription file
    table.string('translationStatus').defaultTo('pending') // 'pending', 'available', 'failed'
    table.string('translationFilePath') // S3 URL for translation file
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('files', (table) => {
    table.dropColumn('transcriptStatus')
    table.dropColumn('transcriptionFilePath')
    table.dropColumn('translationStatus')
    table.dropColumn('translationFilePath')
  })
}
