import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { CLASSES } from '../constants';
import { useAnneeScolaire } from '../context/AnneeScolaire.jsx';
import ClassTabs from '../components/ClassTabs.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

// Règle : 120 CPM = 10/20. Note plafonnée à 20.
const calculerNote = (cpm) => {
    const n = Number(cpm);
    if (!Number.isFinite(n) || n <= 0) return null;
    const brute = (n / 120) * 10;
    return Math.round(Math.max(0, Math.min(20, brute)) * 100) / 100;
};

const formaterNote = (note) => {
    if (note === null || note === undefined) return '—';
    return Number(note).toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const classeNote = (note) => {
    if (note === null || note === undefined) return '';
    if (note >= 10) return 'badge paye'; // réutilise le style vert existant
    return 'badge impaye';                // réutilise le style rouge existant
};

export default function Dactylographie() {
    const { annee, toutes, anneePourEcriture, rafraichir } = useAnneeScolaire();
    const [classe, setClasse] = useState(CLASSES[0]);

    // Liste (tableau par classe)
    const [lignes, setLignes] = useState([]);
    const [chargement, setChargement] = useState(true);

    // Formulaire
    const [classeSaisie, setClasseSaisie] = useState(CLASSES[0]);
    const [anneeSaisie, setAnneeSaisie] = useState(anneePourEcriture);
    const [numero, setNumero] = useState('');
    const [cpm, setCpm] = useState('');
    const [eleveTrouve, setEleveTrouve] = useState(null);
    const [enRecherche, setEnRecherche] = useState(false);

    const [erreur, setErreur] = useState('');
    const [info, setInfo] = useState('');
    const [aSupprimer, setASupprimer] = useState(null);

    // ---- Chargement du tableau de la classe active ----
    const charger = useCallback(async () => {
        setChargement(true);
        try {
            setLignes(
                await api(
                    `/dactylographie?classe=${encodeURIComponent(classe)}&annee_scolaire=${encodeURIComponent(annee)}`
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

    useEffect(() => {
        setAnneeSaisie(anneePourEcriture);
    }, [anneePourEcriture]);

    function changerClasse(c) {
        setClasse(c);
        setClasseSaisie(c);
        setEleveTrouve(null);
        setNumero('');
        setCpm('');
        setErreur('');
        setInfo('');
    }

    // ---- Recherche automatique de l'élève dès que classe + numéro sont renseignés ----
    async function chercherEleve() {
        setErreur('');
        setInfo('');
        setEleveTrouve(null);

        const n = Number(numero);
        if (!classeSaisie || !Number.isInteger(n) || n < 1) return;

        setEnRecherche(true);
        try {
            const eleve = await api(
                `/dactylographie/verifier?classe=${encodeURIComponent(classeSaisie)}&numero=${encodeURIComponent(
                    n
                )}&annee_scolaire=${encodeURIComponent(anneeSaisie)}`
            );
            setEleveTrouve(eleve);
            // Préremplit le CPM s'il y a déjà une note enregistrée
            setCpm(eleve.cpm != null ? String(eleve.cpm) : '');
        } catch (err) {
            // Pas trouvé : on laisse le champ vide, on affiche l'erreur discrètement
            setErreur(err.message);
        } finally {
            setEnRecherche(false);
        }
    }

    // Déclenche la recherche quand classe, numéro ou année changent
    useEffect(() => {
        if (numero !== '' && Number(numero) > 0) {
            const t = setTimeout(chercherEleve, 250);
            return () => clearTimeout(t);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classeSaisie, numero, anneeSaisie]);

    // ---- Enregistrement de la note ----
    async function enregistrer(e) {
        e.preventDefault();
        setErreur('');
        setInfo('');

        if (!eleveTrouve) {
            setErreur("Recherchez d'abord un élève valide (classe + numéro).");
            return;
        }
        const c = Number(cpm);
        if (!Number.isFinite(c) || c < 0) {
            setErreur('Saisissez une vitesse valide en CPM.');
            return;
        }

        try {
            await api('/dactylographie', {
                method: 'POST',
                body: {
                    classe: classeSaisie,
                    numero: Number(numero),
                    annee_scolaire: anneeSaisie,
                    cpm: c,
                },
            });
            setInfo(`Note enregistrée pour ${eleveTrouve.prenom} ${eleveTrouve.nom}.`);
            rafraichir();
            // Si on est sur la même classe/année que le tableau affiché, on recharge
            if (classeSaisie === classe && anneeSaisie === annee) charger();
        } catch (err) {
            setErreur(err.message);
        }
    }

    async function confirmerSuppression() {
        const l = aSupprimer;
        if (!l) return;
        try {
            await api(`/dactylographie/${l.dactylo_id}`, { method: 'DELETE' });
            setInfo(`Note supprimée pour ${l.prenom} ${l.nom}.`);
            if (eleveTrouve?.eleve_id === l.eleve_id) {
                setEleveTrouve(null);
                setCpm('');
            }
            charger();
        } catch (err) {
            setErreur(err.message);
        } finally {
            setASupprimer(null);
        }
    }

    // Aperçu en direct de la note pendant la saisie
    const noteApercu = cpm !== '' ? calculerNote(cpm) : null;

    // Statistiques rapides
    const nbNotes = lignes.filter((l) => l.note != null).length;
    const moyenne =
        nbNotes > 0
            ? lignes.filter((l) => l.note != null).reduce((s, l) => s + Number(l.note), 0) / nbNotes
            : null;

    const anneesFormulaire = [anneePourEcriture];

    return (
        <>
            <h1 className="titre-page">Dactylographie</h1>
            <p className="sous-titre">
                {toutes ? 'Toutes les années' : `Année scolaire ${annee}`} — barème :{' '}
                <strong>120 CPM = 10/20</strong>
            </p>

            {aSupprimer && (
                <ConfirmModal
                    titre="Supprimer la note"
                    texteConfirmer="Supprimer"
                    danger
                    onFermer={() => setASupprimer(null)}
                    onConfirmer={confirmerSuppression}
                >
                    Supprimer la note de {aSupprimer.prenom} {aSupprimer.nom} ({aSupprimer.cpm} CPM,{' '}
                    {formaterNote(aSupprimer.note)}/20) ?
                </ConfirmModal>
            )}

            {/* ---------------- Formulaire ---------------- */}
            <form className="carte formulaire" onSubmit={enregistrer} noValidate>
                <h2>Enregistrer une note</h2>
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
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Vitesse (CPM)
                        <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            max="2000"
                            value={cpm}
                            onChange={(e) => setCpm(e.target.value)}
                            disabled={!eleveTrouve}
                            placeholder="120"
                        />
                    </label>
                </div>

                {/* Affiche le nom complet dès que l'élève est trouvé */}
                {enRecherche && <p className="muet">Recherche…</p>}

                {eleveTrouve && (
                    <div className="dactylo-eleve">
                        <div>
                            <strong>
                                {eleveTrouve.prenom} {eleveTrouve.nom}
                            </strong>
                            <span className="muet">
                                {' '}· {eleveTrouve.classe}, n°{eleveTrouve.numero} · {eleveTrouve.annee_scolaire}
                            </span>
                            {eleveTrouve.note != null && (
                                <p className="muet" style={{ margin: '4px 0 0' }}>
                                    Note actuelle : <strong>{formaterNote(eleveTrouve.note)}/20</strong> (
                                    {eleveTrouve.cpm} CPM)
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Aperçu de la note calculée */}
                {eleveTrouve && noteApercu !== null && (
                    <div className={`dactylo-apercu ${noteApercu >= 10 ? 'ok' : 'ko'}`}>
                        Note calculée : <strong>{formaterNote(noteApercu)}/20</strong>
                    </div>
                )}

                {erreur && <p className="message erreur" role="alert">{erreur}</p>}
                {info && <p className="message ok" role="status">{info}</p>}

                <div className="actions">
                    <button type="submit" className="bouton" disabled={!eleveTrouve || cpm === ''}>
                        Enregistrer la note
                    </button>
                    {(numero !== '' || eleveTrouve) && (
                        <button
                            type="button"
                            className="bouton secondaire"
                            onClick={() => {
                                setNumero('');
                                setCpm('');
                                setEleveTrouve(null);
                                setErreur('');
                                setInfo('');
                            }}
                        >
                            Effacer
                        </button>
                    )}
                </div>
            </form>

            {/* ---------------- Tableau par classe ---------------- */}
            <ClassTabs value={classe} onChange={changerClasse} />

            <div className="carte tableau-liste">
                <p className="resume">
                    {toutes
                        ? 'Sélectionnez une année pour voir les notes.'
                        : lignes.length === 0
                            ? `Aucun élève en ${classe} pour ${annee}.`
                            : `${nbNotes} note${nbNotes > 1 ? 's' : ''} sur ${lignes.length} élève${lignes.length > 1 ? 's' : ''
                            } en ${classe}${moyenne != null ? ` · moyenne : ${formaterNote(moyenne)}/20` : ''}`}
                </p>

                {!toutes && lignes.length > 0 && (
                    <div className="defilement">
                        <table>
                            <thead>
                                <tr>
                                    <th>N°</th>
                                    <th>Nom</th>
                                    <th>Prénom</th>
                                    {toutes && <th>Année</th>}
                                    <th>CPM</th>
                                    <th>Note / 20</th>
                                    <th aria-label="Actions" />
                                </tr>
                            </thead>
                            <tbody>
                                {lignes.map((l) => (
                                    <tr key={l.eleve_id}>
                                        <td className="num">{l.numero}</td>
                                        <td>{l.nom}</td>
                                        <td>{l.prenom}</td>
                                        {toutes && <td>{l.annee_scolaire}</td>}
                                        <td>{l.cpm != null ? l.cpm : '—'}</td>
                                        <td>
                                            <span className={classeNote(l.note)}>
                                                {l.note != null ? `${formaterNote(l.note)}/20` : 'Non noté'}
                                            </span>
                                        </td>
                                        <td className="cellule-actions">
                                            {l.dactylo_id ? (
                                                <button
                                                    type="button"
                                                    className="lien danger"
                                                    onClick={() => setASupprimer(l)}
                                                >
                                                    Supprimer
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="lien"
                                                    onClick={() => {
                                                        setClasseSaisie(l.classe);
                                                        setNumero(String(l.numero));
                                                        setAnneeSaisie(l.annee_scolaire);
                                                        setEleveTrouve(l);
                                                        setCpm(l.cpm != null ? String(l.cpm) : '');
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                >
                                                    Saisir
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