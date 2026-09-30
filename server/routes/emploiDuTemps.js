import { Router } from 'express';
import { pool } from '../db.js';
import { CLASSES, anneeValide } from '../constants.js';

const router = Router();

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const REGEX_HEURE = /^\d{2}:\d{2}$/;

function valider(corps) {
    const classe = corps.classe;
    const annee_scolaire = corps.annee_scolaire;
    const jour = corps.jour;
    const heure_debut = String(corps.heure_debut ?? '').slice(0, 5);
    const heure_fin = String(corps.heure_fin ?? '').slice(0, 5);
    const matiere = String(corps.matiere ?? '').trim();
    const enseignant = corps.enseignant ? String(corps.enseignant).trim() : null;
    const salle = corps.salle ? String(corps.salle).trim() : null;

    if (!CLASSES.includes(classe)) return { erreur: 'Choisissez une classe valide.' };
    if (!anneeValide(annee_scolaire)) {
        return { erreur: "L'année scolaire doit être au format 2025-2026." };
    }
    if (!JOURS.includes(jour)) return { erreur: 'Choisissez un jour valide.' };
    if (!REGEX_HEURE.test(heure_debut) || !REGEX_HEURE.test(heure_fin)) {
        return { erreur: 'Les heures doivent être au format HH:MM.' };
    }
    if (heure_fin <= heure_debut) {
        return { erreur: "L'heure de fin doit être après l'heure de début." };
    }
    if (!matiere) return { erreur: 'La matière est obligatoire.' };

    return {
        valeurs: { classe, annee_scolaire, jour, heure_debut, heure_fin, matiere, enseignant, salle },
    };
}

// Liste des créneaux d'une classe pour une année
router.get('/', async (req, res) => {
    const { classe, annee_scolaire } = req.query;
    if (!CLASSES.includes(classe)) return res.status(400).json({ message: 'Classe invalide.' });
    if (!anneeValide(annee_scolaire)) {
        return res.status(400).json({ message: 'Année scolaire invalide.' });
    }

    const [rows] = await pool.query(
        `SELECT * FROM emploi_du_temps
     WHERE classe = ? AND annee_scolaire = ?
     ORDER BY FIELD(jour, ${JOURS.map((j) => `'${j}'`).join(',')}), heure_debut`,
        [classe, annee_scolaire]
    );
    res.json(rows);
});

// Création d'un créneau
router.post('/', async (req, res) => {
    const { erreur, valeurs } = valider(req.body || {});
    if (erreur) return res.status(400).json({ message: erreur });

    const [r] = await pool.query(
        `INSERT INTO emploi_du_temps
     (classe, annee_scolaire, jour, heure_debut, heure_fin, matiere, enseignant, salle)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            valeurs.classe,
            valeurs.annee_scolaire,
            valeurs.jour,
            valeurs.heure_debut,
            valeurs.heure_fin,
            valeurs.matiere,
            valeurs.enseignant,
            valeurs.salle,
        ]
    );
    const [[cree]] = await pool.query('SELECT * FROM emploi_du_temps WHERE id = ?', [r.insertId]);
    res.status(201).json(cree);
});

// Modification d'un créneau
router.put('/:id', async (req, res) => {
    const { erreur, valeurs } = valider(req.body || {});
    if (erreur) return res.status(400).json({ message: erreur });

    const [r] = await pool.query(
        `UPDATE emploi_du_temps SET
      classe = ?, annee_scolaire = ?, jour = ?, heure_debut = ?, heure_fin = ?,
      matiere = ?, enseignant = ?, salle = ?
     WHERE id = ?`,
        [
            valeurs.classe,
            valeurs.annee_scolaire,
            valeurs.jour,
            valeurs.heure_debut,
            valeurs.heure_fin,
            valeurs.matiere,
            valeurs.enseignant,
            valeurs.salle,
            req.params.id,
        ]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Créneau introuvable.' });
    const [[maj]] = await pool.query('SELECT * FROM emploi_du_temps WHERE id = ?', [req.params.id]);
    res.json(maj);
});

// Suppression
router.delete('/:id', async (req, res) => {
    const [r] = await pool.query('DELETE FROM emploi_du_temps WHERE id = ?', [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Créneau introuvable.' });
    res.status(204).end();
});

// Vue d'ensemble : tous les créneaux de toutes les classes pour une année.
// Renvoie un objet { [classe]: [creneaux...] }.
router.get('/toutes-classes', async (req, res) => {
    const { annee_scolaire } = req.query;
    if (!anneeValide(annee_scolaire)) {
        return res.status(400).json({ message: 'Année scolaire invalide.' });
    }

    const [rows] = await pool.query(
        `SELECT * FROM emploi_du_temps
       WHERE annee_scolaire = ?
       ORDER BY FIELD(classe, ${CLASSES.map((c) => `'${c}'`).join(',')}),
                FIELD(jour, ${JOURS.map((j) => `'${j}'`).join(',')}),
                heure_debut`,
        [annee_scolaire]
    );

    // Regroupe par classe
    const parClasse = {};
    CLASSES.forEach((c) => { parClasse[c] = []; });
    rows.forEach((r) => {
        if (parClasse[r.classe]) parClasse[r.classe].push(r);
    });

    res.json({ parClasse });
});

export default router;