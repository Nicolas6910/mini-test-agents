# 🚀 Guide de Démarrage Rapide

**Lancez votre système multi-agents en moins de 5 minutes !**

## ⚡ Installation Express

### Prérequis (2 minutes)
```bash
# Vérifiez vos versions
node --version    # Requis: v16.0.0+
npm --version     # Requis: v7.0.0+
git --version     # Pour cloner le projet
```

### Installation (2 minutes)
```bash
# 1. Cloner le projet
git clone https://github.com/Nicolas6910/mini-test-agents.git
cd mini-test-agents

# 2. Installation des dépendances
npm install

# 3. Démarrage complet
npm run start:all
```

### ✅ Vérification (1 minute)
Ouvrez ces URL dans votre navigateur :

- 🌐 **Interface Web** : http://localhost:8080
- 🔌 **API Health** : http://localhost:3000/health  
- 📚 **API Docs** : http://localhost:3000/api/v1/users

Si tout fonctionne, vous verrez :
- ✅ Interface utilisateur responsive
- ✅ Status API "healthy"
- ✅ Liste des utilisateurs de test

## 🎯 Premier Test (3 minutes)

### Étape 1 : Créer un utilisateur
1. Cliquez sur **"Créer un utilisateur"** (bouton ➕)
2. Remplissez :
   - **Nom** : Votre nom
   - **Email** : votre@email.com
   - **Rôle** : Utilisateur
3. Cliquez **"Créer"**

### Étape 2 : Vérifier l'API
```bash
# Test direct de l'API
curl http://localhost:3000/api/v1/users
```

### Étape 3 : Modifier et supprimer
1. Cliquez sur l'icône ✏️ pour modifier
2. Changez le nom, sauvegardez
3. Testez la suppression avec l'icône 🗑️

**🎉 Félicitations ! Votre système multi-agents fonctionne parfaitement.**

## 🔧 Commandes Utiles

### Développement
```bash
# API Backend seule
npm run dev

# Frontend seul (serveur local)
npm run serve

# Tests complets
npm test

# Tests avec surveillance
npm run test:watch
```

### Production
```bash
# Démarrage production
npm start

# Tests de performance
npm run test:performance

# Build optimisé
npm run build
```

## 📱 Fonctionnalités à Tester

### Interface Utilisateur
- ✅ **Responsive** : Testez sur mobile, tablette, desktop
- ✅ **Accessibilité** : Navigation avec `Tab`, `Enter`, `Escape`
- ✅ **Performance** : Chargement < 2.5s, interactions fluides
- ✅ **Notifications** : Messages de succès/erreur automatiques

### API Backend
- ✅ **CRUD Complet** : Créer, lire, modifier, supprimer
- ✅ **Sécurité** : Rate limiting, validation, headers sécurisés
- ✅ **Monitoring** : Health check temps réel
- ✅ **Tests** : Suite complète avec 95%+ coverage

## 🚨 Résolution de Problèmes

### Port déjà utilisé
```bash
# Trouver le processus utilisant le port
lsof -i :3000
lsof -i :8080

# Arrêter le processus
kill -9 [PID]
```

### Erreur de dépendances
```bash
# Nettoyage complet
rm -rf node_modules package-lock.json
npm install
```

### Interface ne charge pas
```bash
# Vérifier l'API backend
curl http://localhost:3000/health

# Redémarrer les services
npm run restart:all
```

## 🎓 Prochaines Étapes

### Exploration Approfondie
1. **[Guide Utilisateur Complet](USER_GUIDE.md)** - Toutes les fonctionnalités
2. **[Documentation API](API.md)** - Référence technique complète  
3. **[Architecture](ARCHITECTURE.md)** - Comprendre le système

### Personnalisation
1. **Configuration** : Modifiez `config/app.json`
2. **Styling** : Personnalisez `public/styles.css`
3. **API Extension** : Ajoutez des endpoints dans `src/api.js`

### Déploiement
1. **[Guide de Déploiement](DEPLOYMENT.md)** - Production ready
2. **Docker** : Containerisation complète
3. **Monitoring** : Métriques et alertes

## 📊 Métriques de Performance

Votre installation devrait afficher :

| Métrique | Valeur Attendue | Comment Vérifier |
|----------|-----------------|------------------|
| **API Response** | < 50ms | Network tab (F12) |
| **Frontend Load** | < 2.5s | Lighthouse audit |
| **Memory Usage** | < 100MB | Task Manager |
| **Test Coverage** | 95%+ | `npm run test:coverage` |

## 🆘 Support Rapide

### Documentation Instantanée
- **F1** : Aide contextuelle dans l'interface
- **F12** : Console développeur pour debug
- **Ctrl+U** : Code source de la page

### Communauté
- 🐛 **Bug** : [GitHub Issues](https://github.com/Nicolas6910/mini-test-agents/issues)
- 💬 **Questions** : [Discussions](https://github.com/Nicolas6910/mini-test-agents/discussions)  
- 📧 **Contact** : Créez une issue avec le label "question"

## 🏆 Mission Accomplie !

Si vous avez suivi ce guide avec succès :

- ✅ **Système opérationnel** en moins de 5 minutes
- ✅ **Premier utilisateur créé** via l'interface
- ✅ **API testée** directement
- ✅ **Architecture comprise** dans les grandes lignes

**🚀 Vous êtes prêt à explorer le plein potentiel du système multi-agents !**

---

<div align="center">

**⚡ Démarrage en 5 Minutes Garanti**

*Simple, rapide, efficace - tel que conçu par nos agents experts*

[📖 Documentation Complète](../README.md) • [👤 Guide Utilisateur](USER_GUIDE.md) • [🔧 Installation Avancée](INSTALLATION.md)

</div>