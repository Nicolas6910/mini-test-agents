const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const config = require('../config/app.json');

const app = express();

// Middleware de sécurité
app.use(helmet());
app.use(cors({
  origin: config.cors.origins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // max 100 requests par IP
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: config.validation.maxBodySize }));
app.use(express.urlencoded({ extended: true }));

// Stockage temporaire en mémoire pour les utilisateurs
let users = [
  { id: 1, name: 'Admin User', email: 'admin@example.com', role: 'admin' },
  { id: 2, name: 'Test User', email: 'test@example.com', role: 'user' }
];
let nextId = 3;

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Middleware de gestion d'erreurs de validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: config.api.version,
    uptime: process.uptime()
  });
});

// GET /api/v1/users - Récupérer tous les utilisateurs
app.get(config.api.prefix + '/users', (req, res) => {
  try {
    const { role, limit = 50 } = req.query;
    let filteredUsers = users;
    
    if (role) {
      filteredUsers = users.filter(user => user.role === role);
    }
    
    const limitedUsers = filteredUsers.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: limitedUsers,
      total: filteredUsers.length,
      returned: limitedUsers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/v1/users/:id - Récupérer un utilisateur spécifique
app.get(config.api.prefix + '/users/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }
    
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/v1/users - Créer un nouvel utilisateur
app.post(config.api.prefix + '/users', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin')
], handleValidationErrors, (req, res) => {
  try {
    const { name, email, role = 'user' } = req.body;
    
    // Vérifier si l'email existe déjà
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already exists'
      });
    }
    
    const newUser = {
      id: nextId++,
      name,
      email,
      role,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// PUT /api/v1/users/:id - Mettre à jour un utilisateur
app.put(config.api.prefix + '/users/:id', [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin')
], handleValidationErrors, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }
    
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const { name, email, role } = req.body;
    
    // Vérifier si le nouvel email existe déjà (sauf pour l'utilisateur actuel)
    if (email && email !== users[userIndex].email) {
      const existingUser = users.find(u => u.email === email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }
    
    // Mettre à jour les champs fournis
    if (name !== undefined) users[userIndex].name = name;
    if (email !== undefined) users[userIndex].email = email;
    if (role !== undefined) users[userIndex].role = role;
    users[userIndex].updatedAt = new Date().toISOString();
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: users[userIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// DELETE /api/v1/users/:id - Supprimer un utilisateur
app.delete(config.api.prefix + '/users/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }
    
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const deletedUser = users.splice(userIndex, 1)[0];
    
    res.json({
      success: true,
      message: 'User deleted successfully',
      data: deletedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Route 404 pour les endpoints non trouvés
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Middleware global de gestion d'erreurs
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: config.server.environment === 'development' ? error.message : 'Something went wrong'
  });
});

module.exports = app;