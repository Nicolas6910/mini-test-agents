const request = require('supertest');
const app = require('../src/api');

describe('Multi-Agent API Tests', () => {
  
  describe('Health Check', () => {
    test('GET /health should return system status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Users API', () => {
    
    test('GET /api/v1/users should return all users', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('returned');
    });

    test('GET /api/v1/users with role filter should work', async () => {
      const response = await request(app)
        .get('/api/v1/users?role=admin')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach(user => {
        expect(user.role).toBe('admin');
      });
    });

    test('GET /api/v1/users/:id should return specific user', async () => {
      const response = await request(app)
        .get('/api/v1/users/1')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('email');
    });

    test('GET /api/v1/users/:id should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/users/999')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    test('GET /api/v1/users/:id should return 400 for invalid ID', async () => {
      const response = await request(app)
        .get('/api/v1/users/invalid')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid user ID format');
    });

    test('POST /api/v1/users should create new user', async () => {
      const newUser = {
        name: 'New Test User',
        email: 'newtest@example.com',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .send(newUser)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(newUser.name);
      expect(response.body.data.email).toBe(newUser.email);
      expect(response.body.data.role).toBe(newUser.role);
      expect(response.body.data).toHaveProperty('createdAt');
    });

    test('POST /api/v1/users should reject invalid data', async () => {
      const invalidUser = {
        name: 'A', // Trop court
        email: 'invalid-email',
        role: 'invalid-role'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .send(invalidUser)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeInstanceOf(Array);
    });

    test('POST /api/v1/users should reject duplicate email', async () => {
      const duplicateUser = {
        name: 'Duplicate User',
        email: 'admin@example.com' // Email d�j� existant
      };

      const response = await request(app)
        .post('/api/v1/users')
        .send(duplicateUser)
        .expect(409);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email already exists');
    });

    test('PUT /api/v1/users/:id should update user', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const response = await request(app)
        .put('/api/v1/users/2')
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data).toHaveProperty('updatedAt');
    });

    test('PUT /api/v1/users/:id should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/v1/users/999')
        .send({ name: 'Updated Name' })
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    test('DELETE /api/v1/users/:id should delete user', async () => {
      // D'abord cr�er un utilisateur � supprimer
      const createResponse = await request(app)
        .post('/api/v1/users')
        .send({
          name: 'To Delete',
          email: 'todelete@example.com'
        });

      const userId = createResponse.body.data.id;

      const deleteResponse = await request(app)
        .delete(`/api/v1/users/${userId}`)
        .expect(200);
      
      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe('User deleted successfully');

      // V�rifier que l'utilisateur n'existe plus
      await request(app)
        .get(`/api/v1/users/${userId}`)
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    test('Should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/non-existent-endpoint')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
    });
  });

});

// Tests d'int�gration sp�cifiques pour le syst�me multi-agents
describe('Multi-Agent Integration Tests', () => {
  
  test('API should be ready for frontend integration', async () => {
    const healthResponse = await request(app)
      .get('/health')
      .expect(200);
    
    expect(healthResponse.body.status).toBe('healthy');

    const usersResponse = await request(app)
      .get('/api/v1/users')
      .expect(200);
    
    expect(usersResponse.body.success).toBe(true);
    expect(usersResponse.body.data).toBeInstanceOf(Array);
  });

  test('CORS headers should be present for frontend', async () => {
    const response = await request(app)
      .get('/api/v1/users')
      .set('Origin', 'http://localhost:3000');
    
    expect(response.headers).toHaveProperty('access-control-allow-origin');
    expect(response.headers).toHaveProperty('access-control-allow-credentials');
  });

  test('Rate limiting should be in place', async () => {
    const response = await request(app)
      .get('/health');
    
    expect(response.headers).toHaveProperty('x-ratelimit-limit');
    expect(response.headers).toHaveProperty('x-ratelimit-remaining');
  });

});