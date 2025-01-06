import express from 'express'
import knex from '../../db/knex.js'

const router = express.Router()

router.get('/usage', async (req, res) => {
  const  organization_id  = req.query.organization_id || 1;

  if (!organization_id) {
      return res.status(400).json({ error: 'Organization ID is required' });
  }

  try {
      const usageData = await knex('service_usage')
          .select('service')
          .sum('tokens_used as total_tokens')
          .sum('audio_duration as total_minutes')
          .sum('cost as total_cost')
          .where('organization_id', organization_id)
          .groupBy('service');

      res.json(usageData);
  } catch (error) {
      console.error('Error fetching usage data:', error);
      res.status(500).json({ error: 'Failed to fetch usage data' });
  }
});


export default router
