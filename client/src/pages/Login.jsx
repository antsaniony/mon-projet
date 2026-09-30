import { useState } from 'react';
import { api, setToken } from '../api';

export default function Login({ onConnecte }) {
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function envoyer(e) {
    e.preventDefault();
    setErreur('');
    setEnvoi(true);
    try {
      const { token } = await api('/auth/login', {
        method: 'POST',
        body: { identifiant, motDePasse },
      });
      setToken(token);
      onConnecte();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="login">
      <section className="login-ardoise">
        <h1>Registre des élèves</h1>
        <p>Inscriptions par classe et suivi du paiement des livres.</p>
      </section>
      <section className="login-formulaire">
        <form onSubmit={envoyer} noValidate>
          <h2>Connexion</h2>
          <label>
            Identifiant
            <input
              type="text"
              autoComplete="username"
              autoFocus
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
            />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              autoComplete="current-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </label>
          {erreur && <p className="message erreur" role="alert">{erreur}</p>}
          <button type="submit" className="bouton" disabled={envoi}>
            {envoi ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </section>
    </div>
  );
}
