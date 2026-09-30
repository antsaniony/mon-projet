import { Router } from 'express';
import { pool } from '../db.js';
import { CLASSES, anneeValide, anneeScolaireActuelle } from '../constants.js';

const router = Router();

// Règle : 120 CPM = 10/20. Note plafonnée à 20, plancher à 0.
function calculerNote(cpm) {
  const brute = (cpm / 120) * 10;
  return Math.max(0, Math.min(20, Math.round(brute * 100) / 100));
}

function validerCorps(corps) {
  const classe = corps.classe;
  const numero = Number(corps.numero);
  const cpm = Number(corps.cpm);
  const annee_scolaire = corps.annee_scolaire || anneeScolaireActuelle();

  if (!CLASSES.includes(classe)) return { erreur: 'Choisissez une classe valide.' };
  if (!Number.isInteger(numero) || numero < 1 || numero > 99) {
    return { erreur: 'Le numéro doit être un entier entre 1 et 99.' };
  }
  if (!Number.isFinite(cpm) || cpm < 0 || cpm > 2000) {
    return { erreur: 'La vitesse doit être un nombre entre 0 et 2000 CPM.' };
  }
  if (!anneeValide(annee_scolaire)) {
    return { erreur: "L'année scolaire doit être au format 2025-2026." };
  }
  return { valeurs: { classe, numero, cpm: Math.round(cpm), annee_scolaire } };
}

// Liste des notes d'une classe pour une année (joint avec les élèves)
router.get('/', async (req, res) => {
  const { classe, annee_scolaire } = req.query;
  if (!CLASSES.includes(classe)) return res.status(400).json({ message: 'Classe invalide.' });
  if (!anneeValide(annee_scolaire)) {
    return res.status(400).json({ message: 'Année scolaire invalide.' });
  }

  const [rows] = await pool.query(
    `SELECT e.id AS eleve_id, e.nom, e.prenom, e.numero, e.classe, e.annee_scolaire,
            d.id AS dactylo_id, d.cpm, d.note, d.maj_le
     FROM eleves e
     LEFT JOIN dactylographie d
       ON d.eleve_id = e.id AND d.annee_scolaire = e.annee_scolaire
     WHERE e.classe = ? AND e.annee_scolaire = ?
     ORDER BY e.numero`,
    [classe, annee_scolaire]
  );
  res.json(rows);
});

// Récupère un élève par classe + numéro + année, avec sa note éventuelle
router.get('/verifier', async (req, res) => {
  const { classe, numero, annee_scolaire } = req.query;
  const n = Number(numero);

  if (!CLASSES.includes(classe)) return res.status(400).json({ message: 'Classe invalide.' });
  if (!Number.isInteger(n) || n < 1 || n > 99) {
    return res.status(400).json({ message: 'Numéro invalide.' });
  }
  if (!anneeValide(annee_scolaire)) {
    return res.status(400).json({ message: 'Année scolaire invalide.' });
  }

  const [rows] = await pool.query(
    `SELECT e.id AS eleve_id, e.nom, e.prenom, e.numero, e.classe, e.annee_scolaire,
            d.id AS dactylo_id, d.cpm, d.note, d.maj_le
     FROM eleves e
     LEFT JOIN dactylographie d
       ON d.eleve_id = e.id AND d.annee_scolaire = e.annee_scolaire
     WHERE e.classe = ? AND e.numero = ? AND e.annee_scolaire = ?`,
    [classe, n, annee_scolaire]
  );

  if (rows.length === 0) {
    return res
      .status(404)
      .json({ message: `Aucun élève n°${n} en ${classe} pour ${annee_scolaire}.` });
  }
  res.json(rows[0]);
});

// Enregistre (ou met à jour) la note d'un élève
router.post('/', async (req, res) => {
  const { erreur, valeurs } = validerCorps(req.body || {});
  if (erreur) return res.status(400).json({ message: erreur });

  const { classe, numero, cpm, annee_scolaire } = valeurs;

  // On retrouve l'élève ciblé
  const [[eleve]] = await pool.query(
    'SELECT * FROM eleves WHERE classe = ? AND numero = ? AND annee_scolaire = ?',
    [classe, numero, annee_scolaire]
  );
  if (!eleve) {
    return res
      .status(404)
      .json({ message: `Aucun élève n°${numero} en ${classe} pour ${annee_scolaire}.` });
  }

  const note = calculerNote(cpm);

  await pool.query(
    `INSERT INTO dactylographie (eleve_id, classe, annee_scolaire, numero, cpm, note)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE cpm = VALUES(cpm), note = VALUES(note),
                             classe = VALUES(classe), numero = VALUES(numero)`,
    [eleve.id, classe, annee_scolaire, numero, cpm, note]
  );

  const [[maj]] = await pool.query(
    `SELECT e.id AS eleve_id, e.nom, e.prenom, e.numero, e.classe, e.annee_scolaire,
            d.id AS dactylo_id, d.cpm, d.note, d.maj_le
     FROM eleves e
     LEFT JOIN dactylographie d
       ON d.eleve_id = e.id AND d.annee_scolaire = e.annee_scolaire
     WHERE e.id = ?`,
    [eleve.id]
  );

  res.status(201).json(maj);
});

// Supprime la note d'un élève
router.delete('/:id', async (req, res) => {
  const [r] = await pool.query('DELETE FROM dactylographie WHERE id = ?', [req.params.id]);
  if (r.affectedRows === 0) return res.status(404).json({ message: 'Note introuvable.' });
  res.status(204).end();
});

export default router;