import dotenv from 'dotenv'
import process from 'node:process'
dotenv.config()
export default {
  development: {
    client: 'pg', // PostgreSQL client
    connection: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'console_bbdd_user',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'console_bbdd',
      ssl: { rejectUnauthorized: false } // For Render-hosted DB
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },
  production: {
    client: 'pg', // PostgreSQL client
    connection: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'console_bbdd_user',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'console_bbdd',
      ssl: { rejectUnauthorized: false } // For Render-hosted DB
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  }
}
