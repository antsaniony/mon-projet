import { useState } from 'react';
import { useAnneeScolaire } from '../context/AnneeScolaire.jsx';
import { anneeValide, TOUTES_ANNEES } from '../constants';

export default function AnneeSelecteur() {
  const { annee, setAnnee, liste, actuelle } = useAnneeScolaire();
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState('');
  const [erreur, setErreur] = useState('');

  function ajouter(e) {
    e.preventDefault();
    const valeur = saisie.trim();
    if (!anneeValide(valeur)) {
      setErreur('Format attendu : 2026-2027, deux années qui se suivent.');
      return;
    }
    setAnnee(valeur);
    setSaisie('');
    setErreur('');
    setOuvert(false);
  }

  const options = liste.includes(annee) || annee === TOUTES_ANNEES ? liste : [annee, ...liste];

  return (
    <div className="selecteur-annee">
      <label>
        Année scolaire
        <select value={annee} onChange={(e) => setAnnee(e.target.value)}>
          {options.map((a) => (
            <option key={a} value={a}>
              {a === actuelle ? `${a} (actuelle)` : a}
            </option>
          ))}
          <option value={TOUTES_ANNEES}>Toutes les années</option>
        </select>
      </label>

      {ouvert ? (
        <form className="nouvelle-annee" onSubmit={ajouter}>
          <input
            type="text"
            placeholder="2026-2027"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            autoFocus
          />
          <div className="nouvelle-annee-actions">
            <button type="submit" className="lien-discret">Utiliser</button>
            <button
              type="button"
              className="lien-discret"
              onClick={() => {
                setOuvert(false);
                setErreur('');
                setSaisie('');
              }}
            >
              Annuler
            </button>
          </div>
          {erreur && <p className="message erreur petit">{erreur}</p>}
        </form>
      ) : (
        <button type="button" className="lien-discret" onClick={() => setOuvert(true)}>
          + Démarrer une nouvelle année
        </button>
      )}
    </div>
  );
}
