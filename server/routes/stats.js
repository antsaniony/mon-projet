import { Router } from 'express';
import { pool } from '../db.js';
import { CLASSES, anneeValide } from '../constants.js';

const router = Router();

router.get('/', async (req, res) => {
  const { annee_scolaire } = req.query;
  if (annee_scolaire && annee_scolaire !== 'toutes' && !anneeValide(annee_scolaire)) {
    return res.status(400).json({ message: 'Année scolaire invalide.' });
  }

  const filtrer = annee_scolaire && annee_scolaire !== 'toutes';
  const clause = filtrer ? 'WHERE annee_scolaire = ?' : '';
  const params = filtrer ? [annee_scolaire] : [];

  const [[global]] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(a_paye), 0) AS payes FROM eleves ${clause}`,
    params
  );
  const [lignes] = await pool.query(
    `SELECT classe, COUNT(*) AS total, COALESCE(SUM(a_paye), 0) AS payes
     FROM eleves ${clause} GROUP BY classe`,
    params
  );

  const parClasseMap = new Map(lignes.map((l) => [l.classe, { total: Number(l.total), payes: Number(l.payes) }]));
  const parClasse = CLASSES.map((classe) => {
    const d = parClasseMap.get(classe) || { total: 0, payes: 0 };
    return { classe, total: d.total, payes: d.payes, nonPayes: d.total - d.payes };
  });

  const total = Number(global.total);
  const payes = Number(global.payes);
  res.json({ total, payes, nonPayes: total - payes, parClasse });
});

export default router;
