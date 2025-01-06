import Knex from 'knex'
import knexConfig from '../../knexfile.js'

const knex = Knex(knexConfig.development) // Use the appropriate environment
export default knex
