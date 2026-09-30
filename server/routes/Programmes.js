import { Router } from 'express';
import { pool } from '../db.js';
import { CLASSES, anneeValide } from '../constants.js';
import { PROGRAMMES } from '../programmes.js';

const router = Router();

// Récupère l'avancement d'une classe pour une année donnée.
// Renvoie une matrice `avancement[trimestre][chapitre] = true|false`,
// alignée sur la structure de PROGRAMMES, avec des false par défaut.
router.get('/', async (req, res) => {
    const { classe, annee_scolaire } = req.query;
    if (!CLASSES.includes(classe)) return res.status(400).json({ message: 'Classe invalide.' });
    if (!anneeValide(annee_scolaire)) {
        return res.status(400).json({ message: 'Année scolaire invalide.' });
    }

    const programme = PROGRAMMES[classe];
    if (!programme) return res.status(400).json({ message: 'Aucun programme pour cette classe.' });

    const [rows] = await pool.query(
        `SELECT trimestre_index, chapitre_index, fait
     FROM programmes_avancement
     WHERE classe = ? AND annee_scolaire = ?`,
        [classe, annee_scolaire]
    );

    const avancement = programme.map((t, ti) =>
        t.chapitres.map((_, ci) => {
            const ligne = rows.find((r) => r.trimestre_index === ti && r.chapitre_index === ci);
            return !!(ligne && ligne.fait);
        })
    );

    res.json({ avancement });
});

// Met à jour (ou crée) l'état d'un chapitre.
// Corps attendu : { classe, annee_scolaire, trimestre, chapitre, fait }
router.put('/', async (req, res) => {
    const corps = req.body || {};
    const classe = corps.classe;
    const annee_scolaire = corps.annee_scolaire;
    const trimestre = Number(corps.trimestre);
    const chapitre = Number(corps.chapitre);
    const fait = corps.fait ? 1 : 0;

    if (!CLASSES.includes(classe)) return res.status(400).json({ message: 'Classe invalide.' });
    if (!anneeValide(annee_scolaire)) {
        return res.status(400).json({ message: 'Année scolaire invalide.' });
    }

    const programme = PROGRAMMES[classe];
    if (!programme || !programme[trimestre] || !programme[trimestre].chapitres[chapitre]) {
        return res.status(400).json({ message: 'Chapitre invalide.' });
    }

    await pool.query(
        `INSERT INTO programmes_avancement
       (classe, annee_scolaire, trimestre_index, chapitre_index, fait)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE fait = VALUES(fait)`,
        [classe, annee_scolaire, trimestre, chapitre, fait]
    );

    res.json({ ok: true });
});

export default router;