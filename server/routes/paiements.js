import { Router } from 'express';
import { pool } from '../db.js';
import { CLASSES, anneeValide, anneeScolaireActuelle } from '../constants.js';
import { formater } from './eleves.js';

const router = Router();

function lireClasseEtNumeroEtAnnee(source, { anneeObligatoire = true } = {}) {
  const classe = source.classe;
  const numero = Number(source.numero);
  const annee_scolaire = source.annee_scolaire || (anneeObligatoire ? null : anneeScolaireActuelle());

  if (!CLASSES.includes(classe)) return { erreur: 'Choisissez une classe valide.' };
  if (!Number.isInteger(numero) || numero < 1 || numero > 99) {
    return { erreur: 'Le numéro doit être un nombre entier entre 1 et 99.' };
  }
  if (!annee_scolaire || !anneeValide(annee_scolaire)) {
    return { erreur: "L'année scolaire doit être au format 2025-2026." };
  }
  return { classe, numero, annee_scolaire };
}

async function trouverEleve(classe, numero, annee_scolaire) {
  const [rows] = await pool.query(
    'SELECT * FROM eleves WHERE classe = ? AND numero = ? AND annee_scolaire = ?',
    [classe, numero, annee_scolaire]
  );
  return rows[0] ? formater(rows[0]) : null;
}

// Liste des élèves d'une classe (et, en général, d'une année) avec leur statut de paiement
router.get('/', async (req, res) => {
  const { classe, annee_scolaire } = req.query;
  if (!CLASSES.includes(classe)) return res.status(400).json({ message: 'Classe invalide.' });
  if (annee_scolaire && annee_scolaire !== 'toutes' && !anneeValide(annee_scolaire)) {
    return res.status(400).json({ message: 'Année scolaire invalide.' });
  }

  const conditions = ['classe = ?'];
  const params = [classe];
  if (annee_scolaire && annee_scolaire !== 'toutes') {
    conditions.push('annee_scolaire = ?');
    params.push(annee_scolaire);
  }

  const [rows] = await pool.query(
    `SELECT * FROM eleves WHERE ${conditions.join(' AND ')} ORDER BY annee_scolaire DESC, numero`,
    params
  );
  res.json(rows.map(formater));
});

// Vérifie si un élève (classe + numéro + année) a payé son livre
router.get('/verifier', async (req, res) => {
  const { erreur, classe, numero, annee_scolaire } = lireClasseEtNumeroEtAnnee(req.query);
  if (erreur) return res.status(400).json({ message: erreur });

  const eleve = await trouverEleve(classe, numero, annee_scolaire);
  if (!eleve) {
    return res
      .status(404)
      .json({ message: `Aucun élève n°${numero} en ${classe} pour ${annee_scolaire}.` });
  }
  res.json(eleve);
});

// Enregistre le paiement du livre
router.post('/', async (req, res) => {
  const { erreur, classe, numero, annee_scolaire } = lireClasseEtNumeroEtAnnee(req.body || {});
  if (erreur) return res.status(400).json({ message: erreur });

  const eleve = await trouverEleve(classe, numero, annee_scolaire);
  if (!eleve) {
    return res
      .status(404)
      .json({ message: `Aucun élève n°${numero} en ${classe} pour ${annee_scolaire}.` });
  }
  if (eleve.a_paye) {
    return res.status(409).json({ message: 'Cet élève a déjà payé son livre.' });
  }

  await pool.query('UPDATE eleves SET a_paye = 1, date_paiement = NOW() WHERE id = ?', [eleve.id]);
  res.json(await trouverEleve(classe, numero, annee_scolaire));
});

// Annule un paiement enregistré par erreur
router.delete('/:id', async (req, res) => {
  const [r] = await pool.query(
    'UPDATE eleves SET a_paye = 0, date_paiement = NULL WHERE id = ?',
    [req.params.id]
  );
  if (r.affectedRows === 0) return res.status(404).json({ message: 'Élève introuvable.' });
  const [[eleve]] = await pool.query('SELECT * FROM eleves WHERE id = ?', [req.params.id]);
  res.json(formater(eleve));
});

export default router;
