import knex from '../config/knex.js'

/**
 * Log usage and cost to the database.
 * @param {Object} usage - The usage details.
 * @param {number} usage.organization_id - The ID of the organization.
 * @param {string} usage.service - The service name (e.g., 'transcribe', 'translate').
 * @param {number} usage.tokens_used - Tokens used (optional).
 * @param {number} usage.audio_duration - Audio duration in seconds (optional).
 * @param {number} usage.cost - Calculated cost.
 */
export async function logUsage({
  organization_id,
  user_id,
  service,
  tokens_used = 0,
  audio_duration = 0,
  cost
}) {
  try {
    await knex('service_usage').insert({
      organization_id,
      user_id,
      service,
      tokens_used,
      audio_duration,
      cost,
      created_at: new Date()
    })
  } catch (error) {
    console.error('Error logging usage:', error)
    throw error
  }
}

export default logUsage
