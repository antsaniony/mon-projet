import { useState } from 'react';
import { useAnneeScolaire } from '../context/AnneeScolaire.jsx';
import { anneeValide, TOUTES_ANNEES } from '../constants';

export default function AnneeScolairePage() {
  const { annee, setAnnee, liste, actuelle } = useAnneeScolaire();
  const [saisie, setSaisie] = useState('');
  const [erreur, setErreur] = useState('');

  function creer(e) {
    e.preventDefault();
    const valeur = saisie.trim();
    if (!anneeValide(valeur)) {
      setErreur('Format attendu : 2026-2027, deux années qui se suivent.');
      return;
    }
    setAnnee(valeur);
    setSaisie('');
    setErreur('');
  }

  return (
    <>
      <h1 className="titre-page">Année scolaire</h1>
      <p className="sous-titre">
        L'année choisie ici s'applique au dashboard, aux élèves et aux paiements.
      </p>

      <div className="carte">
        <h2>Année active</h2>
        <div className="liste-annees">
          {liste.map((a) => (
            <button
              key={a}
              type="button"
              className={a === annee ? 'carte-annee actif' : 'carte-annee'}
              onClick={() => setAnnee(a)}
            >
              {a}
              {a === actuelle && <span className="etiquette">actuelle</span>}
            </button>
          ))}
          <button
            type="button"
            className={annee === TOUTES_ANNEES ? 'carte-annee actif' : 'carte-annee'}
            onClick={() => setAnnee(TOUTES_ANNEES)}
          >
            Toutes les années
          </button>
        </div>
      </div>

      <div className="carte formulaire">
        <h2>Démarrer une nouvelle année scolaire</h2>
        <p className="muet" style={{ marginTop: 0 }}>
          Elle apparaîtra ici dès que vous l'activez ; les numéros repartiront de 1 pour chaque
          classe dès la première inscription.
        </p>
        <form onSubmit={creer} noValidate>
          <label>
            Nouvelle année
            <input
              type="text"
              placeholder="2026-2027"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
            />
          </label>
          {erreur && <p className="message erreur" role="alert">{erreur}</p>}
          <div className="actions">
            <button type="submit" className="bouton">Créer et activer</button>
          </div>
        </form>
      </div>
    </>
  );
}
