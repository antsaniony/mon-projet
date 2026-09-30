import { Router } from 'express';
import { pool } from '../db.js';
import { CLASSES, anneeValide, anneeScolaireActuelle, dateNaissanceValide } from '../constants.js';

const router = Router();

// mysql2 renvoie un objet Date pour les colonnes DATE. Sérialisé tel quel
// en JSON, toISOString() applique une conversion UTC qui peut décaler la
// date d'un jour. On formate donc manuellement en "YYYY-MM-DD" à partir
// des composantes locales, ce qui correspond à la date stockée.
const formaterDate = (valeur) => {
  if (!valeur) return null;
  if (valeur instanceof Date) {
    const annee = valeur.getFullYear();
    const mois = String(valeur.getMonth() + 1).padStart(2, '0');
    const jour = String(valeur.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  }
  // Si c'est déjà une chaîne "YYYY-MM-DD...", on garde les 10 premiers
  return String(valeur).slice(0, 10);
};

export const formater = (e) => ({
  ...e,
  date_naissance: formaterDate(e.date_naissance),
  a_paye: !!e.a_paye,
});

function validerIdentite(corps) {
  const nom = String(corps.nom ?? '').trim();
  const prenom = String(corps.prenom ?? '').trim();
  const classe = corps.classe;
  const annee_scolaire = corps.annee_scolaire || anneeScolaireActuelle();
  const date_naissance = corps.date_naissance;

  if (!nom) return { erreur: 'Le nom est obligatoire.' };
  if (!prenom) return { erreur: 'Le prénom est obligatoire.' };
  if (!dateNaissanceValide(date_naissance)) {
    return { erreur: 'La date de naissance est invalide.' };
  }
  if (!CLASSES.includes(classe)) return { erreur: 'Choisissez une classe valide.' };
  if (!anneeValide(annee_scolaire)) {
    return { erreur: "L'année scolaire doit être au format 2025-2026." };
  }
  return { valeurs: { nom, prenom, date_naissance, classe, annee_scolaire } };
}

// Le numéro d'un élève est propre à sa classe et à son année scolaire :
// le n°1 de 6e n'a rien à voir avec le n°1 de Terminale, ni avec le n°1
// de l'année suivante.
async function prochainNumero(classe, annee_scolaire) {
  const [[{ suivant }]] = await pool.query(
    'SELECT COALESCE(MAX(numero), 0) + 1 AS suivant FROM eleves WHERE classe = ? AND annee_scolaire = ?',
    [classe, annee_scolaire]
  );
  return suivant;
}

async function insererAvecNumeroAuto(valeurs) {
  for (let tentative = 0; tentative < 5; tentative++) {
    const numero = await prochainNumero(valeurs.classe, valeurs.annee_scolaire);
    try {
      const [r] = await pool.query(
        'INSERT INTO eleves (nom, prenom, date_naissance, classe, numero, annee_scolaire) VALUES (?, ?, ?, ?, ?, ?)',
        [valeurs.nom, valeurs.prenom, valeurs.date_naissance, valeurs.classe, numero, valeurs.annee_scolaire]
      );
      return r.insertId;
    } catch (err) {
      // Deux inscriptions simultanées peuvent viser le même numéro : on retente.
      if (err.code === 'ER_DUP_ENTRY' && tentative < 4) continue;
      throw err;
    }
  }
}

router.get('/', async (req, res) => {
  const { classe, annee_scolaire } = req.query;
  if (classe && !CLASSES.includes(classe)) {
    return res.status(400).json({ message: 'Classe invalide.' });
  }
  if (annee_scolaire && annee_scolaire !== 'toutes' && !anneeValide(annee_scolaire)) {
    return res.status(400).json({ message: 'Année scolaire invalide.' });
  }

  const conditions = [];
  const params = [];
  if (classe) {
    conditions.push('classe = ?');
    params.push(classe);
  }
  if (annee_scolaire && annee_scolaire !== 'toutes') {
    conditions.push('annee_scolaire = ?');
    params.push(annee_scolaire);
  }

  const ou = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT * FROM eleves ${ou} ORDER BY annee_scolaire DESC, FIELD(classe, ${CLASSES.map(
      (c) => `'${c}'`
    ).join(',')}), numero`,
    params
  );
  res.json(rows.map(formater));
});

// Aperçu du numéro qui sera attribué à la prochaine inscription. N'écrit rien.
router.get('/prochain', async (req, res) => {
  const { classe, annee_scolaire } = req.query;
  if (!CLASSES.includes(classe)) return res.status(400).json({ message: 'Classe invalide.' });
  if (!anneeValide(annee_scolaire)) {
    return res.status(400).json({ message: 'Année scolaire invalide.' });
  }
  res.json({ numero: await prochainNumero(classe, annee_scolaire) });
});

router.post('/', async (req, res) => {
  const { erreur, valeurs } = validerIdentite(req.body || {});
  if (erreur) return res.status(400).json({ message: erreur });

  try {
    const id = await insererAvecNumeroAuto(valeurs);
    const [[eleve]] = await pool.query('SELECT * FROM eleves WHERE id = ?', [id]);
    res.status(201).json(formater(eleve));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Impossible d'attribuer un numéro pour le moment. Réessayez." });
  }
});

router.put('/:id', async (req, res) => {
  const { erreur, valeurs } = validerIdentite(req.body || {});
  if (erreur) return res.status(400).json({ message: erreur });

  const [[existant]] = await pool.query('SELECT * FROM eleves WHERE id = ?', [req.params.id]);
  if (!existant) return res.status(404).json({ message: 'Élève introuvable.' });

  const changeDeClasseOuAnnee =
    existant.classe !== valeurs.classe || existant.annee_scolaire !== valeurs.annee_scolaire;

  try {
    if (!changeDeClasseOuAnnee) {
      // Même classe et même année : le numéro ne bouge pas.
      await pool.query(
        'UPDATE eleves SET nom = ?, prenom = ?, date_naissance = ?, classe = ?, annee_scolaire = ? WHERE id = ?',
        [valeurs.nom, valeurs.prenom, valeurs.date_naissance, valeurs.classe, valeurs.annee_scolaire, req.params.id]
      );
    } else {
      // Changement de classe ou d'année : on renumérote dans le nouveau groupe.
      let fait = false;
      for (let tentative = 0; tentative < 5 && !fait; tentative++) {
        const numero = await prochainNumero(valeurs.classe, valeurs.annee_scolaire);
        try {
          await pool.query(
            'UPDATE eleves SET nom = ?, prenom = ?, date_naissance = ?, classe = ?, numero = ?, annee_scolaire = ? WHERE id = ?',
            [
              valeurs.nom,
              valeurs.prenom,
              valeurs.date_naissance,
              valeurs.classe,
              numero,
              valeurs.annee_scolaire,
              req.params.id,
            ]
          );
          fait = true;
        } catch (err) {
          if (err.code === 'ER_DUP_ENTRY' && tentative < 4) continue;
          throw err;
        }
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Impossible d'attribuer un numéro pour le moment. Réessayez." });
  }

  const [[eleve]] = await pool.query('SELECT * FROM eleves WHERE id = ?', [req.params.id]);
  res.json(formater(eleve));
});

router.delete('/:id', async (req, res) => {
  const [r] = await pool.query('DELETE FROM eleves WHERE id = ?', [req.params.id]);
  if (r.affectedRows === 0) return res.status(404).json({ message: 'Élève introuvable.' });
  res.status(204).end();
});

export default router;