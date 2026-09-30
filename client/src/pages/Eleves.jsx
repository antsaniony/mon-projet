import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { CLASSES } from '../constants';
import { useAnneeScolaire } from '../context/AnneeScolaire.jsx';
import ClassTabs from '../components/ClassTabs.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { IconeCrayon, IconePoubelle } from '../components/icones.jsx';

const aujourdhui = () => new Date().toISOString().slice(0, 10);

function calculerAge(dateNaissance) {
  if (!dateNaissance) return null;
  const naissance = new Date(dateNaissance);
  if (Number.isNaN(naissance.getTime())) return null;
  const maintenant = new Date();
  let age = maintenant.getFullYear() - naissance.getFullYear();
  const pasEncoreAnniversaire =
    maintenant.getMonth() < naissance.getMonth() ||
    (maintenant.getMonth() === naissance.getMonth() && maintenant.getDate() < naissance.getDate());
  if (pasEncoreAnniversaire) age -= 1;
  return age;
}

// L'API renvoie désormais date_naissance sous forme de chaîne "YYYY-MM-DD".
// On garde une fonction défensive au cas où une valeur inattendue arriverait.
const formaterDatePourInput = (valeur) => {
  if (!valeur) return '';
  return String(valeur).slice(0, 10);
};

const formulaireVide = (classe, annee_scolaire) => ({
  nom: '',
  prenom: '',
  date_naissance: '',
  classe,
  annee_scolaire,
});

export default function Eleves() {
  const { annee, toutes, anneePourEcriture, rafraichir } = useAnneeScolaire();
  const [classe, setClasse] = useState(CLASSES[0]);
  const [eleves, setEleves] = useState([]);
  const [form, setForm] = useState(formulaireVide(CLASSES[0], anneePourEcriture));
  const [editId, setEditId] = useState(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [apercuNumero, setApercuNumero] = useState(null);
  const [erreur, setErreur] = useState('');
  const [info, setInfo] = useState('');
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [aSupprimer, setASupprimer] = useState(null);
  const original = useRef(null); // classe/année/numéro de l'élève avant modification

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setEleves(
        await api(
          `/eleves?classe=${encodeURIComponent(classe)}&annee_scolaire=${encodeURIComponent(annee)}`
        )
      );
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }, [classe, annee]);

  useEffect(() => {
    charger();
  }, [charger]);

  const rafraichirApercu = useCallback(async (classeCible, anneeCible) => {
    try {
      const d = await api(
        `/eleves/prochain?classe=${encodeURIComponent(classeCible)}&annee_scolaire=${encodeURIComponent(
          anneeCible
        )}`
      );
      setApercuNumero(d.numero);
    } catch {
      setApercuNumero(null);
    }
  }, []);

  // Quand l'année globale change (et qu'on n'édite pas), le formulaire suit.
  useEffect(() => {
    if (!editId) setForm((f) => ({ ...f, annee_scolaire: anneePourEcriture }));
  }, [anneePourEcriture, editId]);

  // Aperçu du numéro : celui de l'élève en cours d'édition s'il ne change
  // ni de classe ni d'année, sinon le prochain numéro libre du groupe visé.
  useEffect(() => {
    const memeGroupe =
      original.current &&
      original.current.classe === form.classe &&
      original.current.annee_scolaire === form.annee_scolaire;

    if (memeGroupe) {
      setApercuNumero(original.current.numero);
      return;
    }
    rafraichirApercu(form.classe, form.annee_scolaire);
  }, [form.classe, form.annee_scolaire, rafraichirApercu]);

  function changerClasse(c) {
    setClasse(c);
    setErreur('');
    setInfo('');
  }

  const modifierChamp = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  function ouvrirAjout() {
    setEditId(null);
    original.current = null;
    setForm(formulaireVide(classe, anneePourEcriture));
    setErreur('');
    setInfo('');
    setModalOuvert(true);
  }

  function fermerModal() {
    setModalOuvert(false);
    setEditId(null);
    original.current = null;
    setErreur('');
    setInfo('');
  }

  async function envoyer(e) {
    e.preventDefault();
    setErreur('');
    setInfo('');
    try {
      if (editId) {
        await api(`/eleves/${editId}`, { method: 'PUT', body: form });
        setInfo('Élève modifié.');
      } else {
        await api('/eleves', { method: 'POST', body: form });
        setInfo('Élève enregistré.');
      }
      const classeCible = form.classe;
      const anneeCible = form.annee_scolaire;
      setEditId(null);
      original.current = null;
      // Le formulaire repart vierge, prêt pour l'inscription suivante ; la
      // fenêtre reste ouverte tant qu'on n'a pas cliqué sur « Fermer ».
      setForm(formulaireVide(classeCible, anneeCible));
      rafraichir();
      rafraichirApercu(classeCible, anneeCible);
      if (classeCible !== classe) setClasse(classeCible);
      else charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  function commencerModification(el) {
    setEditId(el.id);
    original.current = { classe: el.classe, annee_scolaire: el.annee_scolaire, numero: el.numero };
    setForm({
      nom: el.nom,
      prenom: el.prenom,
      date_naissance: formaterDatePourInput(el.date_naissance),
      classe: el.classe,
      annee_scolaire: el.annee_scolaire,
    });
    setErreur('');
    setInfo('');
    setModalOuvert(true);
  }

  function annulerModification() {
    setEditId(null);
    original.current = null;
    setForm(formulaireVide(classe, anneePourEcriture));
    setErreur('');
    setInfo('');
  }

  function demanderSuppression(el) {
    setASupprimer(el);
  }

  async function confirmerSuppression() {
    const el = aSupprimer;
    if (!el) return;
    try {
      await api(`/eleves/${el.id}`, { method: 'DELETE' });
      setInfo('Élève supprimé.');
      if (editId === el.id) annulerModification();
      rafraichir();
      charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setASupprimer(null);
    }
  }

  const texteRecherche = recherche.trim().toLowerCase();
  const elevesFiltres = eleves.filter((el) => {
    const matchRecherche =
      texteRecherche === '' ||
      `${el.nom} ${el.prenom}`.toLowerCase().includes(texteRecherche) ||
      String(el.numero) === texteRecherche;
    const matchStatut =
      filtreStatut === 'tous' || (filtreStatut === 'paye' ? el.a_paye : !el.a_paye);
    return matchRecherche && matchStatut;
  });

  return (
    <>
      <div className="entete-page">
        <div>
          <h1 className="titre-page">Élèves</h1>
          <p className="sous-titre">{toutes ? 'Toutes les années' : `Année scolaire ${annee}`}</p>
        </div>
        <button type="button" className="bouton" onClick={ouvrirAjout}>
          + Ajouter un élève
        </button>
      </div>

      {modalOuvert && (
        <Modal title={editId ? "Modifier l'élève" : 'Nouvel élève'} onClose={fermerModal}>
          <form onSubmit={envoyer} noValidate>
            <div className="grille-formulaire grille-formulaire-modal">
              <label>
                Nom
                <input type="text" value={form.nom} onChange={modifierChamp('nom')} autoFocus />
              </label>
              <label>
                Prénom
                <input type="text" value={form.prenom} onChange={modifierChamp('prenom')} />
              </label>
              <label>
                Classe
                <select value={form.classe} onChange={modifierChamp('classe')}>
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Date de naissance
                <input
                  type="date"
                  value={form.date_naissance}
                  max={aujourdhui()}
                  onChange={modifierChamp('date_naissance')}
                />
              </label>
            </div>

            <p className="apercu-numero">
              Numéro {editId ? 'attribué' : 'qui sera attribué'} :{' '}
              <strong>{apercuNumero ?? '…'}</strong>
              <span className="muet"> (automatique, par classe et par année)</span>
            </p>

            {erreur && <p className="message erreur" role="alert">{erreur}</p>}
            {info && <p className="message ok" role="status">{info}</p>}

            <div className="actions">
              <button type="submit" className="bouton">
                {editId ? 'Enregistrer les modifications' : "Enregistrer l'élève"}
              </button>
              {editId && (
                <button type="button" className="bouton secondaire" onClick={annulerModification}>
                  Annuler la modification
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}

      {aSupprimer && (
        <ConfirmModal
          titre="Supprimer l'élève"
          texteConfirmer="Supprimer"
          danger
          onFermer={() => setASupprimer(null)}
          onConfirmer={confirmerSuppression}
        >
          Supprimer {aSupprimer.prenom} {aSupprimer.nom} (n°{aSupprimer.numero},{' '}
          {aSupprimer.annee_scolaire}) ? Cette action est définitive.
        </ConfirmModal>
      )}

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
        {chargement ? (
          <p className="muet">Chargement…</p>
        ) : elevesFiltres.length === 0 ? (
          <p className="muet vide">
            {eleves.length === 0
              ? toutes
                ? `Aucun élève en ${classe}, toutes années confondues.`
                : `Aucun élève en ${classe} pour ${annee}.`
              : 'Aucun élève ne correspond à cette recherche.'}
          </p>
        ) : (
          <div className="defilement">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Âge</th>
                  {toutes && <th>Année</th>}
                  <th>Livre</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {elevesFiltres.map((el) => (
                  <tr key={el.id}>
                    <td className="num">{el.numero}</td>
                    <td>{el.nom}</td>
                    <td>{el.prenom}</td>
                    <td>
                      {(() => {
                        const age = calculerAge(el.date_naissance);
                        return age ? `${age} ans` : '-';
                      })()}
                    </td>
                    {toutes && <td>{el.annee_scolaire}</td>}
                    <td>
                      <span className={el.a_paye ? 'badge paye' : 'badge impaye'}>
                        {el.a_paye ? 'Payé' : 'Non payé'}
                      </span>
                    </td>
                    <td className="cellule-actions">
                      <button
                        type="button"
                        className="icone-bouton modifier"
                        onClick={() => commencerModification(el)}
                        title="Modifier"
                        aria-label={`Modifier ${el.prenom} ${el.nom}`}
                      >
                        <IconeCrayon />
                      </button>
                      <button
                        type="button"
                        className="icone-bouton supprimer"
                        onClick={() => demanderSuppression(el)}
                        title="Supprimer"
                        aria-label={`Supprimer ${el.prenom} ${el.nom}`}
                      >
                        <IconePoubelle />
                      </button>
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