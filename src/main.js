const app = require('./api');
const config = require('../config/app.json');

const PORT = process.env.PORT || config.server.port;
const HOST = process.env.HOST || config.server.host;

// Fonction de démarrage du serveur
const startServer = () => {
  const server = app.listen(PORT, HOST, () => {
    console.log(`=€ Server running on http://${HOST}:${PORT}`);
    console.log(`=Ê Health check: http://${HOST}:${PORT}/health`);
    console.log(`= API endpoint: http://${HOST}:${PORT}${config.api.prefix}`);
    console.log(`< Environment: ${config.server.environment}`);
    console.log(' Multi-Agent Backend API Ready!');
  });

  // Gestion gracieuse de l'arrêt
  process.on('SIGTERM', () => {
    console.log('=õ SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log(' Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('=õ SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log(' Server closed');
      process.exit(0);
    });
  });

  return server;
};

// Démarrer le serveur si ce fichier est exécuté directement
if (require.main === module) {
  startServer();
}

module.exports = { startServer, app };