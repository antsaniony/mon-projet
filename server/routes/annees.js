import { Router } from 'express';
import { pool } from '../db.js';
import { anneeScolaireActuelle } from '../constants.js';

const router = Router();

// Renvoie l'année scolaire en cours et la liste de toutes les années
// connues (celles qui ont au moins un élève, plus l'année en cours).
router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT DISTINCT annee_scolaire FROM eleves ORDER BY annee_scolaire DESC'
  );
  const actuelle = anneeScolaireActuelle();
  const ensemble = new Set(rows.map((r) => r.annee_scolaire));
  ensemble.add(actuelle);
  const liste = [...ensemble].sort().reverse();
  res.json({ actuelle, liste });
});

export default router;
