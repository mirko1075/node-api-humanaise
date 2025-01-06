import knex from '../config/knex.js'

/**
 * Calculates the cost and logs the service usage dynamically based on service_pricing.
 * @param {Object} params - Parameters for cost calculation and logging.
 * @param {number} params.serviceId - The service ID from the database (e.g., '1' for transcription, '2' for translation).
 * @param {number} params.organizationId - ID of the organization using the service.
 * @param {number} params.userId - ID of the user invoking the service.
 * @param {number} params.tokensUsed - Tokens used for the service (optional).
 * @param {number} params.audioDuration - Audio duration in seconds (optional).
 * @param {number} params.bytes - Size of the file in bytes (optional).
 * @param {Object} params.requestMetadata - Metadata about the request (optional).
 * @param {Object} params.responseMetadata - Metadata about the response (optional).
 * @param {string} params.status - Status of the service usage (default: 'in_progress').
 * @returns {Object} - Returns an object with calculated cost and usage details.
 */
const calculateCostAndLogUsage = async ({
  serviceId,
  organizationId,
  userId,
  tokensUsed = 0,
  audioDuration = 0,
  bytes = 0,
  requestMetadata = null,
  responseMetadata = null,
  status = 'in_progress'
}) => {
  try {
    // Fetch active pricing for the organization and service
    const pricing = await knex('service_pricing')
      .select('price', 'currency')
      .where({
        organization_id: organizationId,
        service_id: serviceId,
        is_active: true
      })
      .first()

    if (!pricing) {
      throw new Error(
        `Active pricing not found for organization_id: ${organizationId}, service_id: ${serviceId}`
      )
    }

    const { price, currency } = pricing

    // Calculate the cost
    let cost = 0
    if (tokensUsed > 0) {
      // If the service charges per token
      cost += tokensUsed * parseFloat(price)
    }
    if (audioDuration > 0) {
      // If the service charges per minute
      cost += (audioDuration / 60) * parseFloat(price) // Convert seconds to minutes
    }

    // Insert the usage record into the service_usage table
    await knex('service_usage').insert({
      organization_id: organizationId,
      user_id: userId,
      service_id: serviceId,
      tokens_used: tokensUsed,
      audio_duration: audioDuration,
      bytes,
      cost,
      request_metadata: requestMetadata,
      response_metadata: responseMetadata,
      status,
      created_at: new Date(),
      updated_at: new Date()
    })

    // Return calculated cost and usage details
    return {
      serviceId,
      organizationId,
      userId,
      tokensUsed,
      audioDuration,
      bytes,
      cost,
      currency,
      status
    }
  } catch (error) {
    console.error('Error in calculateCostAndLogUsage:', error)
    throw error
  }
}

export default calculateCostAndLogUsage
