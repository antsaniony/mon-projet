import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { identifiant, motDePasse } = req.body || {};
  if (!identifiant || !motDePasse) {
    return res.status(400).json({ message: 'Saisissez votre identifiant et votre mot de passe.' });
  }

  const [rows] = await pool.query('SELECT * FROM utilisateurs WHERE identifiant = ?', [
    String(identifiant).trim(),
  ]);
  const utilisateur = rows[0];
  const valide = utilisateur && (await bcrypt.compare(String(motDePasse), utilisateur.mot_de_passe));

  if (!valide) {
    return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect.' });
  }

  const token = jwt.sign(
    { id: utilisateur.id, identifiant: utilisateur.identifiant },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token });
});

export default router;
