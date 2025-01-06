import knex from '../config/knex.js'
import calculateCost from '../utils/calculateCost.js'
import logger from '../utils/logger.js'

const usageService = {
  /**
   * Log service usage to the database
   * @param {Object} usageData
   * @param {Number} usageData.organizationId - The ID of the organization
   * @param {Number} usageData.userId - The ID of the user
   * @param {String} usageData.service - The type of service used
   * @param {Number} usageData.duration - Audio duration in seconds (if applicable)
   * @param {Number} usageData.tokens - Tokens used (if applicable)
   * @param {String} usageData.provider - Service provider (e.g., 'OpenAI', 'Google')
   * @param {Object} usageData.metadata - Additional metadata for the usage
   */
  async logUsage({
    organizationId,
    userId,
    service,
    duration = 0,
    tokens = 0,
    provider,
    metadata = {}
  }) {
    try {
      // Calculate the cost based on usage
      const cost = await calculateCost({
        service,
        duration,
        tokens,
        provider
      })

      // Insert usage into the `service_usage_logs` table
      const [usageLog] = await knex('service_usage_logs')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          service,
          provider,
          audio_duration: duration ? duration / 60 : null, // Convert seconds to minutes
          tokens_used: tokens || null,
          cost,
          metadata: JSON.stringify(metadata),
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*')

      logger.info(`Usage logged: ${JSON.stringify(usageLog)}`)
      return usageLog
    } catch (error) {
      logger.error('Error logging usage:', error)
      throw new Error('Failed to log usage')
    }
  },

  /**
   * Retrieve usage logs from the database
   * @param {Object} filters - Filters for querying usage logs
   * @returns {Promise<Array>} - List of usage logs
   */
  async getUsageLogs(filters) {
    try {
      const logs = await knex('service_usage_logs')
        .where(filters)
        .orderBy('created_at', 'desc')

      return logs
    } catch (error) {
      logger.error('Error fetching usage logs:', error)
      throw new Error('Failed to retrieve usage logs')
    }
  },

  /**
   * Calculate cost for a service without logging
   * @param {Object} costData
   * @param {String} costData.service - Service type
   * @param {Number} costData.duration - Audio duration in seconds (if applicable)
   * @param {Number} costData.tokens - Tokens used (if applicable)
   * @param {String} costData.provider - Service provider (e.g., 'OpenAI', 'Google')
   * @returns {Number} - Calculated cost
   */
  async calculateCost({ service, duration = 0, tokens = 0, provider }) {
    try {
      const cost = await calculateCost({ service, duration, tokens, provider })
      return cost
    } catch (error) {
      logger.error('Error calculating cost:', error)
      throw new Error('Failed to calculate cost')
    }
  }
}

export default usageService
