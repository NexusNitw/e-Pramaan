import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import config from '../config/env.js';

const JWT_SECRET = config.jwtSecret || process.env.JWT_SECRET || 'epramaan-regulatory-default-jwt-secret-2026';
const JWT_EXPIRES_IN = '7d';

/**
 * Generate standard JWT Token with user identity and role.
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Authenticate user with Email and Password.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email address and password.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. No registered user found with this email.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password incorrect.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Contact AICTE administrative cell.',
      });
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: `Login successful. Welcome back, ${user.name}.`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institutionName: user.institutionName,
        aictePermanentId: user.aictePermanentId,
        officerDesignation: user.officerDesignation,
        employeeId: user.employeeId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register a new user account (Applicant or Officer).
 */
export const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = 'APPLICANT',
      institutionName = '',
      aictePermanentId = '',
      officerDesignation = '',
      employeeId = '',
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.',
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: ['OFFICER', 'APPLICANT', 'ADMIN'].includes(role) ? role : 'APPLICANT',
      institutionName,
      aictePermanentId,
      officerDesignation: officerDesignation || (role === 'OFFICER' ? 'Scrutiny Officer' : ''),
      employeeId,
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institutionName: user.institutionName,
        aictePermanentId: user.aictePermanentId,
        officerDesignation: user.officerDesignation,
        employeeId: user.employeeId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile.
 */
export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

/**
 * Seed default demonstration accounts for seamless regulatory evaluation.
 */
export const seedDefaultUsers = async () => {
  try {
    const defaultAccounts = [
      {
        name: 'Dr. Vikram Malhotra',
        email: 'officer@aicte.gov.in',
        password: 'Password@123',
        role: 'OFFICER',
        officerDesignation: 'Senior Scrutiny Officer',
        employeeId: 'AICTE-HQ-2026-892',
      },
      {
        name: 'Dr. Anand Joshi',
        email: 'applicant@college.edu.in',
        password: 'Password@123',
        role: 'APPLICANT',
        institutionName: 'Apex Institute of Technology & Sciences',
        aictePermanentId: '1-3349182390',
      },
      {
        name: 'AICTE Platform Administrator',
        email: 'admin@aicte.gov.in',
        password: 'Password@123',
        role: 'ADMIN',
        officerDesignation: 'Central IT Director',
        employeeId: 'AICTE-ADMIN-01',
      },
    ];

    for (const acc of defaultAccounts) {
      const exists = await User.findOne({ email: acc.email });
      if (!exists) {
        await User.create(acc);
        console.log(`[Auth Seeder] Created default demo user: ${acc.email} (${acc.role})`);
      }
    }
  } catch (err) {
    console.warn('[Auth Seeder] Note on user seeding:', err.message);
  }
};
