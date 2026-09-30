import 'dotenv/config';
import emploiDuTempsRoutes from './routes/emploiDuTemps.js';
import programmesRoutes from './routes/programmes.js';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { init } from './init.js';
import { exigerConnexion } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import statsRoutes from './routes/stats.js';
import elevesRoutes from './routes/eleves.js';
import paiementsRoutes from './routes/paiements.js';
import anneesRoutes from './routes/annees.js';
import dactylographieRoutes from './routes/dactylographie.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET manquant : copiez server/.env.example vers server/.env');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/stats', exigerConnexion, statsRoutes);
app.use('/api/eleves', exigerConnexion, elevesRoutes);
app.use('/api/paiements', exigerConnexion, paiementsRoutes);
app.use('/api/annees', exigerConnexion, anneesRoutes);
app.use('/api/emploi-du-temps', exigerConnexion, emploiDuTempsRoutes);
app.use('/api/programmes', exigerConnexion, programmesRoutes);
app.use('/api/dactylographie', exigerConnexion, dactylographieRoutes);
app.use('/api', (req, res) => res.status(404).json({ message: 'Route introuvable.' }));

// En production, le serveur sert aussi l'interface React compilée
const dossier = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(dossier, '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
});

const PORT = Number(process.env.PORT || 4000);

init()
  .then(() => app.listen(PORT, () => console.log(`API prête sur http://localhost:${PORT}`)))
  .catch((err) => {
    console.error("Impossible d'initialiser la base de données :", err.message);
    process.exit(1);
  });
