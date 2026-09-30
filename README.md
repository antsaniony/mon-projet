# Registre des élèves

React + Vite (interface) · Express + Node (API) · MySQL (base de données)

## Démarrage

1. Vérifiez que MySQL tourne sur votre machine.
2. Installez les dépendances :
   npm run install:all
3. Configurez le serveur :
   cp server/.env.example server/.env
   puis renseignez DB_USER / DB_PASSWORD et changez JWT_SECRET.
4. Lancez l'API et l'interface ensemble :
   npm run dev
5. Ouvrez http://localhost:5173

La base et les tables sont créées automatiquement au premier démarrage.
Le compte de connexion est créé à partir de ADMIN_IDENTIFIANT et
ADMIN_MOT_DE_PASSE (par défaut : admin / admin1234). Changez-les avant la mise en service.

## Production

   npm run build
   npm start

Le serveur Express sert alors l'interface compilée sur http://localhost:4000.
