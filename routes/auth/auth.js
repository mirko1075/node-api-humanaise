import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import knex from '../../db/knex.js'
import dotenv from 'dotenv'
import process from 'node:process'
dotenv.config()

const router = express.Router()

// Register User
router.post('/register', async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ error: 'Request body is required.' })
  }

  const { name, email, password, organizationName } = req.body

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: 'Name, email, and password are required.' })
  }

  try {
    // Check if the user already exists
    const existingUser = await knex('users').where({ email }).first()
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists.' })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create a new user
    const [user] = await knex('users')
      .insert({
        name,
        email,
        password: hashedPassword,
        role: 'user' // Default role for a new user
      })
      .returning(['id', 'name']) // Returning id and name for clarity

    const userId = user.id // Extract the user ID

    if (organizationName) {
      // Check if the organization exists
      const organization = await knex('organizations')
        .where({ name: organizationName })
        .first()

      if (organization) {
        // Add the user to the existing organization
        await knex('organization_members').insert({
          user_id: userId,
          organization_id: organization.id
        })

        return res.status(201).json({
          message:
            'User registered successfully and added to the organization!',
          user: { id: userId, email, organization_id: organization.id }
        })
      } else {
        // Organization does not exist, inform the user
        return res.status(404).json({
          message:
            'User registered successfully, but no organization was found with the provided name.',
          user: { id: userId, email }
        })
      }
    } else {
      // No organization was passed, respond with user details
      return res.status(201).json({
        message:
          'User registered successfully without being linked to any organization.',
        user: { id: userId, email }
      })
    }
  } catch (error) {
    console.error('Error during registration:', error.message || error)
    res.status(500).json({ error: 'Failed to register user.' })
  }
})

// Login User
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'All fields are required.' })
  }

  try {
    // Find the user in the database
    const user = await knex('users').where({ email }).first()
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' })
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' })
    }

    // Generate a JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    res.status(200).json({ message: 'Login successful!', token })
  } catch (error) {
    console.error('Error during login:', error.message || error)
    res.status(500).json({ error: 'Failed to login.' })
  }
})

// Verify JWT token
router.post('/verify-token', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'No token provided.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    res.status(200).json({ message: 'Token is valid.', user: decoded })
  } catch (error) {
    console.error('Token verification failed:', error.message || error)
    res.status(401).json({ error: 'Invalid token.' })
  }
})

router.post('user', (req, res) => {
  res.status(200).json({ message: 'User route is working.' })
})

export default router
