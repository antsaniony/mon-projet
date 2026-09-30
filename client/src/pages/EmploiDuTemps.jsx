import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { CLASSES } from '../constants';
import { useAnneeScolaire } from '../context/AnneeScolaire.jsx';
import ClassTabs from '../components/ClassTabs.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { IconeCrayon, IconePoubelle } from '../components/icones.jsx';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const formulaireVide = (classe, annee_scolaire) => ({
  classe,
  annee_scolaire,
  jour: 'Lundi',
  heure_debut: '08:00',
  heure_fin: '10:00',
  matiere: '',
  enseignant: '',
  salle: '',
});

export default function EmploiDuTemps() {
  const { annee, toutes, anneePourEcriture, rafraichir } = useAnneeScolaire();
  const [vue, setVue] = useState('classe'); // 'classe' | 'ensemble'
  const [classe, setClasse] = useState(CLASSES[0]);
  const [creneaux, setCreneaux] = useState([]);
  const [parClasse, setParClasse] = useState({});
  const [form, setForm] = useState(formulaireVide(CLASSES[0], anneePourEcriture));
  const [editId, setEditId] = useState(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [erreur, setErreur] = useState('');
  const [info, setInfo] = useState('');
  const [chargement, setChargement] = useState(true);
  const [aSupprimer, setASupprimer] = useState(null);

  // ---- Filtres vue d'ensemble ----
  const [recherche, setRecherche] = useState('');
  const [filtreJour, setFiltreJour] = useState('tous');

  // -------- Chargement vue "par classe" --------
  const chargerClasse = useCallback(async () => {
    setChargement(true);
    try {
      setCreneaux(
        await api(
          `/emploi-du-temps?classe=${encodeURIComponent(classe)}&annee_scolaire=${encodeURIComponent(annee)}`
        )
      );
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }, [classe, annee]);

  // -------- Chargement vue "toutes classes" --------
  const chargerEnsemble = useCallback(async () => {
    setChargement(true);
    try {
      const d = await api(
        `/emploi-du-temps/toutes-classes?annee_scolaire=${encodeURIComponent(annee)}`
      );
      setParClasse(d.parClasse);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }, [annee]);

  useEffect(() => {
    if (toutes) return;
    if (vue === 'classe') chargerClasse();
    else chargerEnsemble();
  }, [vue, chargerClasse, chargerEnsemble, toutes]);

  useEffect(() => {
    if (!editId) setForm((f) => ({ ...f, annee_scolaire: anneePourEcriture }));
  }, [anneePourEcriture, editId]);

  function changerClasse(c) {
    setClasse(c);
    setErreur('');
    setInfo('');
  }

  const modifierChamp = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  function ouvrirAjout() {
    setEditId(null);
    setForm(formulaireVide(classe, anneePourEcriture));
    setErreur('');
    setInfo('');
    setModalOuvert(true);
  }

  function fermerModal() {
    setModalOuvert(false);
    setEditId(null);
    setErreur('');
    setInfo('');
  }

  async function envoyer(e) {
    e.preventDefault();
    setErreur('');
    setInfo('');
    try {
      if (editId) {
        await api(`/emploi-du-temps/${editId}`, { method: 'PUT', body: form });
        setInfo('Créneau modifié.');
      } else {
        await api('/emploi-du-temps', { method: 'POST', body: form });
        setInfo('Créneau ajouté.');
      }
      const classeCible = form.classe;
      setEditId(null);
      setForm(formulaireVide(classeCible, form.annee_scolaire));
      rafraichir();
      if (classeCible !== classe) setClasse(classeCible);
      else chargerClasse();
    } catch (err) {
      setErreur(err.message);
    }
  }

  function commencerModification(c) {
    setEditId(c.id);
    setForm({
      classe: c.classe,
      annee_scolaire: c.annee_scolaire,
      jour: c.jour,
      heure_debut: c.heure_debut.slice(0, 5),
      heure_fin: c.heure_fin.slice(0, 5),
      matiere: c.matiere,
      enseignant: c.enseignant || '',
      salle: c.salle || '',
    });
    setErreur('');
    setInfo('');
    setModalOuvert(true);
  }

  async function confirmerSuppression() {
    const c = aSupprimer;
    if (!c) return;
    try {
      await api(`/emploi-du-temps/${c.id}`, { method: 'DELETE' });
      setInfo('Créneau supprimé.');
      if (vue === 'classe') chargerClasse();
      else chargerEnsemble();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setASupprimer(null);
    }
  }

  // ---- Filtre une liste de créneaux selon la recherche + le jour ----
  function filtrerCreneaux(liste) {
    const texte = recherche.trim().toLowerCase();
    return liste.filter((c) => {
      const matchJour = filtreJour === 'tous' || c.jour === filtreJour;
      const matchTexte =
        texte === '' ||
        c.matiere.toLowerCase().includes(texte) ||
        (c.enseignant || '').toLowerCase().includes(texte) ||
        (c.salle || '').toLowerCase().includes(texte);
      return matchJour && matchTexte;
    });
  }

  // Regroupe par jour pour la vue "par classe" (après filtrage)
  const creneauxFiltres = filtrerCreneaux(creneaux);
  const parJour = JOURS.map((jour) => ({
    jour,
    creneaux: creneauxFiltres.filter((c) => c.jour === jour),
  }));

  // Vue d'ensemble : filtre chaque classe, puis ignore les classes vides
  const classesAvecCreneaux = CLASSES.map((c) => ({
    classe: c,
    creneaux: filtrerCreneaux(parClasse[c] || []),
  })).filter((c) => c.creneaux.length > 0);

  const aucuneDonneeEnsemble = classesAvecCreneaux.length === 0;
  const aucunResultatFiltre =
    (vue === 'classe' && creneaux.length > 0 && creneauxFiltres.length === 0) ||
    (vue === 'ensemble' &&
      CLASSES.some((c) => (parClasse[c] || []).length > 0) &&
      aucuneDonneeEnsemble);

  const filtresActifs = recherche.trim() !== '' || filtreJour !== 'tous';

  return (
    <>
      <div className="entete-page">
        <div>
          <h1 className="titre-page">Emploi du temps</h1>
          <p className="sous-titre">
            {toutes ? 'Choisissez une année' : `Année scolaire ${annee}`}
          </p>
        </div>
        {vue === 'classe' && !toutes && (
          <button type="button" className="bouton" onClick={ouvrirAjout}>
            + Ajouter un créneau
          </button>
        )}
      </div>

      {/* Sélecteur de vue */}
      <div className="onglets" role="tablist" aria-label="Type de vue">
        <button
          type="button"
          role="tab"
          aria-selected={vue === 'classe'}
          className={vue === 'classe' ? 'onglet actif' : 'onglet'}
          onClick={() => setVue('classe')}
        >
          Par classe
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={vue === 'ensemble'}
          className={vue === 'ensemble' ? 'onglet actif' : 'onglet'}
          onClick={() => setVue('ensemble')}
        >
          Toutes les classes
        </button>
      </div>

      {erreur && <p className="message erreur" role="alert">{erreur}</p>}
      {info && <p className="message ok" role="status">{info}</p>}

      {toutes ? (
        <p className="message erreur">
          L'emploi du temps est propre à chaque année scolaire. Sélectionnez une année dans le
          sélecteur d'année pour continuer.
        </p>
      ) : (
        <>
          {/* Barre de recherche + filtre jour */}
          <div className="barre-outils">
            <input
              type="search"
              placeholder="Rechercher une matière, un enseignant, une salle…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              aria-label="Rechercher un créneau"
            />
            <select
              value={filtreJour}
              onChange={(e) => setFiltreJour(e.target.value)}
              aria-label="Filtrer par jour"
            >
              <option value="tous">Tous les jours</option>
              {JOURS.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
            {filtresActifs && (
              <button
                type="button"
                className="bouton secondaire"
                onClick={() => {
                  setRecherche('');
                  setFiltreJour('tous');
                }}
              >
                Réinitialiser
              </button>
            )}
          </div>

          {vue === 'classe' ? (
            <>
              <ClassTabs value={classe} onChange={changerClasse} />

              <div className="carte tableau-liste">
                {chargement ? (
                  <p className="muet">Chargement…</p>
                ) : creneaux.length === 0 ? (
                  <p className="muet vide">
                    Aucun créneau en {classe} pour {annee}.
                  </p>
                ) : aucunResultatFiltre ? (
                  <p className="muet vide">
                    Aucun créneau ne correspond à cette recherche.
                  </p>
                ) : (
                  <div className="emploi-jours">
                    {parJour.map(({ jour, creneaux: liste }) =>
                      liste.length === 0 ? null : (
                        <div key={jour} className="emploi-jour">
                          <h3 className="emploi-jour-titre">{jour}</h3>
                          <div className="defilement">
                            <table>
                              <thead>
                                <tr>
                                  <th>Horaire</th>
                                  <th>Matière</th>
                                  <th>Enseignant</th>
                                  <th>Salle</th>
                                  <th aria-label="Actions" />
                                </tr>
                              </thead>
                              <tbody>
                                {liste.map((c) => (
                                  <tr key={c.id}>
                                    <td className="num">
                                      {c.heure_debut.slice(0, 5)} – {c.heure_fin.slice(0, 5)}
                                    </td>
                                    <td>{c.matiere}</td>
                                    <td>{c.enseignant || '—'}</td>
                                    <td>{c.salle || '—'}</td>
                                    <td className="cellule-actions">
                                      <button
                                        type="button"
                                        className="icone-bouton modifier"
                                        onClick={() => commencerModification(c)}
                                        title="Modifier"
                                        aria-label={`Modifier ${c.matiere}`}
                                      >
                                        <IconeCrayon />
                                      </button>
                                      <button
                                        type="button"
                                        className="icone-bouton supprimer"
                                        onClick={() => setASupprimer(c)}
                                        title="Supprimer"
                                        aria-label={`Supprimer ${c.matiere}`}
                                      >
                                        <IconePoubelle />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            // ---------- VUE D'ENSEMBLE ----------
            <div className="carte">
              {chargement ? (
                <p className="muet">Chargement…</p>
              ) : aucuneDonneeEnsemble && !filtresActifs ? (
                <p className="muet vide">
                  Aucun créneau enregistré pour l'année {annee}, toutes classes confondues.
                </p>
              ) : aucunResultatFiltre ? (
                <p className="muet vide">
                  Aucun créneau ne correspond à cette recherche.
                </p>
              ) : (
                <div className="emploi-grille">
                  {classesAvecCreneaux.map(({ classe: c, creneaux: liste }) => {
                    const parJourClasse = JOURS.map((jour) => ({
                      jour,
                      creneaux: liste.filter((x) => x.jour === jour),
                    }));

                    return (
                      <div key={c} className="emploi-grille-colonne">
                        <h3 className="emploi-grille-classe">{c}</h3>
                        {parJourClasse.map(({ jour, creneaux: l }) =>
                          l.length === 0 ? null : (
                            <div key={jour} className="emploi-grille-jour">
                              <span className="emploi-grille-jour-nom">{jour}</span>
                              {l.map((cr) => (
                                <div key={cr.id} className="emploi-grille-creneau">
                                  <span className="emploi-grille-horaire">
                                    {cr.heure_debut.slice(0, 5)} – {cr.heure_fin.slice(0, 5)}
                                  </span>
                                  <span className="emploi-grille-matiere">{cr.matiere}</span>
                                  {(cr.enseignant || cr.salle) && (
                                    <span className="emploi-grille-detail">
                                      {cr.enseignant}
                                      {cr.enseignant && cr.salle ? ' · ' : ''}
                                      {cr.salle}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal d'ajout/modification */}
      {modalOuvert && (
        <Modal title={editId ? 'Modifier le créneau' : 'Nouveau créneau'} onClose={fermerModal}>
          <form onSubmit={envoyer} noValidate>
            <div className="grille-formulaire grille-formulaire-modal">
              <label>
                Classe
                <select value={form.classe} onChange={modifierChamp('classe')}>
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Jour
                <select value={form.jour} onChange={modifierChamp('jour')}>
                  {JOURS.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </label>
              <label>
                Heure de début
                <input
                  type="time"
                  value={form.heure_debut}
                  onChange={modifierChamp('heure_debut')}
                />
              </label>
              <label>
                Heure de fin
                <input
                  type="time"
                  value={form.heure_fin}
                  onChange={modifierChamp('heure_fin')}
                />
              </label>
              <label>
                Matière
                <input
                  type="text"
                  value={form.matiere}
                  onChange={modifierChamp('matiere')}
                  autoFocus
                />
              </label>
              <label>
                Enseignant
                <input
                  type="text"
                  value={form.enseignant}
                  onChange={modifierChamp('enseignant')}
                />
              </label>
              <label>
                Salle
                <input
                  type="text"
                  value={form.salle}
                  onChange={modifierChamp('salle')}
                />
              </label>
            </div>

            {erreur && <p className="message erreur" role="alert">{erreur}</p>}
            {info && <p className="message ok" role="status">{info}</p>}

            <div className="actions">
              <button type="submit" className="bouton">
                {editId ? 'Enregistrer les modifications' : 'Ajouter le créneau'}
              </button>
              {editId && (
                <button
                  type="button"
                  className="bouton secondaire"
                  onClick={() => {
                    setEditId(null);
                    setForm(formulaireVide(classe, anneePourEcriture));
                  }}
                >
                  Annuler la modification
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}

      {aSupprimer && (
        <ConfirmModal
          titre="Supprimer le créneau"
          texteConfirmer="Supprimer"
          danger
          onFermer={() => setASupprimer(null)}
          onConfirmer={confirmerSuppression}
        >
          Supprimer le créneau {aSupprimer.matiere} du {aSupprimer.jour} (
          {aSupprimer.heure_debut.slice(0, 5)}–{aSupprimer.heure_fin.slice(0, 5)}) ?
        </ConfirmModal>
      )}
    </>
  );
}