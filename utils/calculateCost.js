import knex from '../src/config/knex.js'
/**
 * Calculate the cost of a service usage.
 * @param {Object} usage - The usage details.
 * @param {string} usage.service - The service name (e.g., 'transcribe', 'translate').
 * @param {string} usage.provider - The provider (e.g., 'openai', 'google').
 * @param {number} usage.tokens - Number of tokens used (for text services).
 * @param {number} usage.duration - Duration in seconds (for audio services).
 * @returns {number} - Calculated cost.
 */
export async function calculateCost({
  service,
  provider,
  tokens = 0,
  duration = 0
}) {
  try {
    const pricing = await knex('service_pricing')
      .where({ service, provider })
      .first()

    if (!pricing) {
      throw new Error(
        `Pricing not found for service: ${service}, provider: ${provider}`
      )
    }
    console.log('pricing :>> ', pricing)
    let cost = 0
    if (tokens) {
      console.log('tokens :>> ', tokens)
      cost += tokens * pricing.price_per_token
    }

    if (duration) {
      console.log('duration :>> ', duration)
      cost += duration * pricing.price_per_minute
    }
    console.log('cost :>> ', cost)
    return parseFloat(cost.toFixed(2)) // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating cost:', error)
    throw error
  }
}
