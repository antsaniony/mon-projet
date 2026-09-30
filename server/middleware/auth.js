import jwt from 'jsonwebtoken';

export function exigerConnexion(req, res, next) {
  const entete = req.headers.authorization || '';
  const token = entete.startsWith('Bearer ') ? entete.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Connexion requise.' });

  try {
    req.utilisateur = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Session expirée. Reconnectez-vous.' });
  }
}
