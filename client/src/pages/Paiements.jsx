import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { CLASSES } from '../constants';
import { useAnneeScolaire } from '../context/AnneeScolaire.jsx';
import ClassTabs from '../components/ClassTabs.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const formaterDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '');

export default function Paiements() {
  const { annee, toutes, anneePourEcriture, liste, actuelle, rafraichir } = useAnneeScolaire();
  const [classe, setClasse] = useState(CLASSES[0]);
  const [liste_eleves, setListeEleves] = useState([]);
  const [classeSaisie, setClasseSaisie] = useState(CLASSES[0]);
  const [anneeSaisie, setAnneeSaisie] = useState(anneePourEcriture);
  const [numero, setNumero] = useState('');
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState('');
  const [info, setInfo] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [aAnnuler, setAAnnuler] = useState(null);

  const charger = useCallback(async () => {
    try {
      setListeEleves(
        await api(
          `/paiements?classe=${encodeURIComponent(classe)}&annee_scolaire=${encodeURIComponent(annee)}`
        )
      );
    } catch (e) {
      setErreur(e.message);
    }
  }, [classe, annee]);

  useEffect(() => {
    charger();
  }, [charger]);

  useEffect(() => {
    setAnneeSaisie(anneePourEcriture);
  }, [anneePourEcriture]);

  function changerClasse(c) {
    setClasse(c);
    setClasseSaisie(c);
    setResultat(null);
    setErreur('');
    setInfo('');
  }

  async function verifier(e) {
    e.preventDefault();
    setErreur('');
    setInfo('');
    setResultat(null);
    try {
      const eleve = await api(
        `/paiements/verifier?classe=${encodeURIComponent(classeSaisie)}&numero=${encodeURIComponent(
          numero
        )}&annee_scolaire=${encodeURIComponent(anneeSaisie)}`
      );
      setResultat(eleve);
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function enregistrerPaiement(el) {
    setErreur('');
    setInfo('');
    try {
      const maj = await api('/paiements', {
        method: 'POST',
        body: { classe: el.classe, numero: el.numero, annee_scolaire: el.annee_scolaire },
      });
      setInfo(`Paiement enregistré pour ${maj.prenom} ${maj.nom}.`);
      if (resultat?.id === maj.id) setResultat(maj);
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function annulerPaiement(el) {
    setErreur('');
    setInfo('');
    try {
      const maj = await api(`/paiements/${el.id}`, { method: 'DELETE' });
      setInfo(`Paiement annulé pour ${maj.prenom} ${maj.nom}.`);
      if (resultat?.id === maj.id) setResultat(maj);
      charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setAAnnuler(null);
    }
  }

  const texteRecherche = recherche.trim().toLowerCase();
  const listeFiltree = liste_eleves.filter((el) => {
    const matchRecherche =
      texteRecherche === '' ||
      `${el.nom} ${el.prenom}`.toLowerCase().includes(texteRecherche) ||
      String(el.numero) === texteRecherche;
    const matchStatut =
      filtreStatut === 'tous' || (filtreStatut === 'paye' ? el.a_paye : !el.a_paye);
    return matchRecherche && matchStatut;
  });

  const nbPayes = liste_eleves.filter((e) => e.a_paye).length;
  const anneesFormulaire = liste.includes(anneeSaisie) ? liste : [anneeSaisie, ...liste];

  return (
    <>
      <h1 className="titre-page">Paiement de livre</h1>
      <p className="sous-titre">{toutes ? 'Toutes les années' : `Année scolaire ${annee}`}</p>

      {aAnnuler && (
        <ConfirmModal
          titre="Annuler le paiement"
          texteConfirmer="Annuler le paiement"
          onFermer={() => setAAnnuler(null)}
          onConfirmer={() => annulerPaiement(aAnnuler)}
        >
          Annuler le paiement de {aAnnuler.prenom} {aAnnuler.nom} ?
        </ConfirmModal>
      )}

      <form className="carte formulaire" onSubmit={verifier} noValidate>
        <h2>Vérifier ou enregistrer un paiement</h2>
        <div className="grille-formulaire compacte">
          <label>
            Classe
            <select value={classeSaisie} onChange={(e) => setClasseSaisie(e.target.value)}>
              {CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Numéro
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="99"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </label>
          <label>
            Année scolaire
            <select value={anneeSaisie} onChange={(e) => setAnneeSaisie(e.target.value)}>
              {anneesFormulaire.map((a) => (
                <option key={a} value={a}>{a === actuelle ? `${a} (actuelle)` : a}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="actions">
          <button type="submit" className="bouton">Vérifier</button>
        </div>

        {erreur && <p className="message erreur" role="alert">{erreur}</p>}
        {info && <p className="message ok" role="status">{info}</p>}

        {resultat && (
          <div className={resultat.a_paye ? 'resultat paye' : 'resultat impaye'}>
            <div>
              <strong>{resultat.prenom} {resultat.nom}</strong>
              <span className="muet"> · {resultat.classe}, n°{resultat.numero} · {resultat.annee_scolaire}</span>
              <p>
                {resultat.a_paye
                  ? `A payé son livre le ${formaterDate(resultat.date_paiement)}.`
                  : "N'a pas encore payé son livre."}
              </p>
            </div>
            {resultat.a_paye ? (
              <button type="button" className="bouton secondaire" onClick={() => setAAnnuler(resultat)}>
                Annuler le paiement
              </button>
            ) : (
              <button type="button" className="bouton" onClick={() => enregistrerPaiement(resultat)}>
                Enregistrer le paiement
              </button>
            )}
          </div>
        )}
      </form>

      <ClassTabs value={classe} onChange={changerClasse} />

      <div className="barre-outils">
        <input
          type="search"
          placeholder="Rechercher un nom, un prénom ou un numéro…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          aria-label="Rechercher un élève"
        />
        <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} aria-label="Filtrer par statut">
          <option value="tous">Tous les statuts</option>
          <option value="paye">Payé</option>
          <option value="impaye">Non payé</option>
        </select>
      </div>

      <div className="carte tableau-liste">
        <p className="resume">
          {liste_eleves.length === 0
            ? toutes
              ? `Aucun élève en ${classe}, toutes années confondues.`
              : `Aucun élève en ${classe} pour ${annee}.`
            : listeFiltree.length === 0
            ? 'Aucun élève ne correspond à cette recherche.'
            : `${nbPayes} payé${nbPayes > 1 ? 's' : ''} sur ${liste_eleves.length} en ${classe}${
                toutes ? '' : ` (${annee})`
              }`}
        </p>
        {listeFiltree.length > 0 && (
          <div className="defilement">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Nom</th>
                  <th>Prénom</th>
                  {toutes && <th>Année</th>}
                  <th>Livre</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {listeFiltree.map((el) => (
                  <tr key={el.id}>
                    <td className="num">{el.numero}</td>
                    <td>{el.nom}</td>
                    <td>{el.prenom}</td>
                    {toutes && <td>{el.annee_scolaire}</td>}
                    <td>
                      <span className={el.a_paye ? 'badge paye' : 'badge impaye'}>
                        {el.a_paye ? `Payé le ${formaterDate(el.date_paiement)}` : 'Non payé'}
                      </span>
                    </td>
                    <td className="cellule-actions">
                      {el.a_paye ? (
                        <button type="button" className="lien danger" onClick={() => setAAnnuler(el)}>
                          Annuler
                        </button>
                      ) : (
                        <button type="button" className="lien" onClick={() => enregistrerPaiement(el)}>
                          Marquer payé
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
