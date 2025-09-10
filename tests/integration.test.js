const { startServer } = require('../src/main');
const request = require('supertest');
const config = require('../config/app.json');

describe('Integration Tests - Server Startup', () => {
  let server;

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });

  test('Server should start successfully', async () => {
    // Test que le serveur peut démarrer sans erreurs
    expect(() => {
      server = startServer();
    }).not.toThrow();

    // Attendre un peu pour que le serveur démarre
    await new Promise(resolve => setTimeout(resolve, 100));

    // Vérifier que le serveur répond
    const response = await request(server)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
  });

  test('Configuration should be loaded correctly', () => {
    expect(config.server).toBeDefined();
    expect(config.api).toBeDefined();
    expect(config.server.port).toBe(3000);
    expect(config.api.version).toBe('v1');
  });

});

describe('Multi-Agent System Readiness Tests', () => {
  
  test('Backend API endpoints are accessible for other agents', async () => {
    const { app } = require('../src/main');
    
    // Test des endpoints critiques pour les autres agents
    const endpoints = [
      { path: '/health', method: 'get', expectedStatus: 200 },
      { path: '/api/v1/users', method: 'get', expectedStatus: 200 },
      { path: '/api/v1/users', method: 'post', expectedStatus: 400, body: {} }, // Validation error expected
    ];

    for (const endpoint of endpoints) {
      const response = await request(app)[endpoint.method](endpoint.path)
        .send(endpoint.body || {});
      
      expect(response.status).toBe(endpoint.expectedStatus);
      
      if (endpoint.expectedStatus === 200) {
        expect(response.body.success).toBe(true);
      }
    }
  });

  test('API returns consistent JSON format for frontend consumption', async () => {
    const { app } = require('../src/main');
    
    const response = await request(app)
      .get('/api/v1/users')
      .expect(200);
    
    // Vérifier le format de réponse standardisé
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toBeInstanceOf(Array);
    
    // Vérifier la structure des objets utilisateur
    if (response.body.data.length > 0) {
      const user = response.body.data[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('role');
    }
  });

  test('Error responses follow consistent format', async () => {
    const { app } = require('../src/main');
    
    const response = await request(app)
      .get('/api/v1/users/999')
      .expect(404);
    
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(typeof response.body.error).toBe('string');
  });

  test('Security middleware is properly configured', async () => {
    const { app } = require('../src/main');
    
    const response = await request(app)
      .get('/health');
    
    // Vérifier les headers de sécurité (helmet)
    expect(response.headers).toHaveProperty('x-content-type-options');
    expect(response.headers).toHaveProperty('x-frame-options');
    
    // Vérifier CORS
    expect(response.headers).toHaveProperty('access-control-allow-origin');
  });

});