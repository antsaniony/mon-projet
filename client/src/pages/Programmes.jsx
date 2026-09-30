import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { CLASSES } from '../constants';
import { PROGRAMMES } from '../programmes';
import { useAnneeScolaire } from '../context/AnneeScolaire.jsx';
import ClassTabs from '../components/ClassTabs.jsx';

export default function Programmes() {
    const { annee, anneePourEcriture, toutes } = useAnneeScolaire();
    const [classe, setClasse] = useState(CLASSES[0]);
    const [avancement, setAvancement] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState('');
    const [info, setInfo] = useState('');

    const charger = useCallback(async () => {
        setChargement(true);
        setErreur('');
        try {
            const d = await api(
                `/programmes?classe=${encodeURIComponent(classe)}&annee_scolaire=${encodeURIComponent(annee)}`
            );
            setAvancement(d.avancement);
        } catch (e) {
            setErreur(e.message);
        } finally {
            setChargement(false);
        }
    }, [classe, annee]);

    useEffect(() => {
        charger();
    }, [charger]);

    async function basculer(trimestre, chapitre) {
        const nouvelleValeur = !avancement[trimestre][chapitre];
        // Mise à jour optimiste : on coche immédiatement, puis on enregistre.
        setAvancement((av) => {
            const copie = av.map((t) => [...t]);
            copie[trimestre][chapitre] = nouvelleValeur;
            return copie;
        });
        try {
            await api('/programmes', {
                method: 'PUT',
                body: {
                    classe,
                    annee_scolaire: annee,
                    trimestre,
                    chapitre,
                    fait: nouvelleValeur,
                },
            });
            setInfo('Progression enregistrée.');
            setTimeout(() => setInfo(''), 1500);
        } catch (e) {
            // En cas d'erreur, on annule la modification
            setAvancement((av) => {
                const copie = av.map((t) => [...t]);
                copie[trimestre][chapitre] = !nouvelleValeur;
                return copie;
            });
            setErreur(e.message);
        }
    }

    const programme = PROGRAMMES[classe] || [];

    return (
        <>
            <div className="entete-page">
                <div>
                    <h1 className="titre-page">Programmes</h1>
                    <p className="sous-titre">
                        {toutes
                            ? 'Choisissez une année dans la barre latérale pour suivre les chapitres.'
                            : `Année scolaire ${annee}`}
                    </p>
                </div>
            </div>

            {toutes ? (
                <p className="message erreur">
                    Le suivi des chapitres est propre à chaque année scolaire. Sélectionnez une année
                    dans le sélecteur d'année pour continuer.
                </p>
            ) : (
                <>
                    <ClassTabs value={classe} onChange={setClasse} />

                    {erreur && <p className="message erreur" role="alert">{erreur}</p>}
                    {info && <p className="message ok" role="status">{info}</p>}

                    {chargement ? (
                        <p className="muet">Chargement…</p>
                    ) : (
                        programme.map((bloc, ti) => (
                            <div key={ti} className="carte programme-trimestre">
                                <h2 className="programme-titre">{bloc.trimestre}</h2>
                                <ul className="programme-liste">
                                    {bloc.chapitres.map((titre, ci) => (
                                        <li key={ci} className="programme-chapitre">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={!!avancement[ti]?.[ci]}
                                                    onChange={() => basculer(ti, ci)}
                                                />
                                                <span className="programme-chapitre-titre">{titre}</span>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    )}
                </>
            )}
        </>
    );
}