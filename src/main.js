const app = require('./api');
const config = require('../config/app.json');

const PORT = process.env.PORT || config.server.port;
const HOST = process.env.HOST || config.server.host;

// Fonction de d�marrage du serveur
const startServer = () => {
  const server = app.listen(PORT, HOST, () => {
    console.log(`=� Server running on http://${HOST}:${PORT}`);
    console.log(`=� Health check: http://${HOST}:${PORT}/health`);
    console.log(`= API endpoint: http://${HOST}:${PORT}${config.api.prefix}`);
    console.log(`< Environment: ${config.server.environment}`);
    console.log(' Multi-Agent Backend API Ready!');
  });

  // Gestion gracieuse de l'arr�t
  process.on('SIGTERM', () => {
    console.log('=� SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log(' Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('=� SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log(' Server closed');
      process.exit(0);
    });
  });

  return server;
};

// D�marrer le serveur si ce fichier est ex�cut� directement
if (require.main === module) {
  startServer();
}

module.exports = { startServer, app };