import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAnneeScolaire } from '../context/AnneeScolaire.jsx';

export default function Dashboard() {
  const { annee, toutes } = useAnneeScolaire();
  const [stats, setStats] = useState(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    setStats(null);
    api(`/stats?annee_scolaire=${encodeURIComponent(annee)}`)
      .then(setStats)
      .catch((e) => setErreur(e.message));
  }, [annee]);

  if (erreur) return <p className="message erreur">{erreur}</p>;
  if (!stats) return <p className="muet">Chargement…</p>;

  const partPayes = stats.total ? (stats.payes / stats.total) * 100 : 0;

  return (
    <>
      <h1 className="titre-page">Dashboard</h1>
      <p className="sous-titre">{toutes ? 'Toutes les années' : `Année scolaire ${annee}`}</p>

      <section className="tableau">
        <div className="total">
          <span className="grand-nombre">{stats.total}</span>
          <span className="libelle">élèves enregistrés</span>
        </div>

        <div className="paye">
          <span className="nombre">{stats.payes}</span>
          <span className="libelle">ont payé leur livre</span>
        </div>

        <div className="impaye">
          <span className="nombre">{stats.nonPayes}</span>
          <span className="libelle">n'ont pas payé</span>
        </div>

        <div className="barre" role="img" aria-label={`${Math.round(partPayes)} % des élèves ont payé`}>
          <div className="barre-payes" style={{ width: `${partPayes}%` }} />
        </div>
      </section>

      {stats.total === 0 ? (
        <p className="muet">
          {toutes
            ? "Aucun élève enregistré pour l'instant. Ajoutez-en depuis la page Élèves."
            : `Aucun élève pour ${annee}. Ajoutez-en depuis la page Élèves.`}
        </p>
      ) : (
        <div className="carte tableau-liste">
          <h2 className="titre-carte">Par classe</h2>
          <div className="defilement">
            <table>
              <thead>
                <tr>
                  <th>Classe</th>
                  <th>Élèves</th>
                  <th>Payé</th>
                  <th>Non payé</th>
                </tr>
              </thead>
              <tbody>
                {stats.parClasse.map((ligne) => (
                  <tr key={ligne.classe}>
                    <td><strong>{ligne.classe}</strong></td>
                    <td>{ligne.total}</td>
                    <td>{ligne.total ? ligne.payes : '—'}</td>
                    <td>{ligne.total ? ligne.nonPayes : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
