import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { anneeScolaireActuelle, TOUTES_ANNEES } from '../constants';

const CLE = 'registre_annee';
const Contexte = createContext(null);

export function AnneeScolaireProvider({ children }) {
  const [annee, setAnneeEtat] = useState(() => localStorage.getItem(CLE) || anneeScolaireActuelle());
  const [actuelle, setActuelle] = useState(anneeScolaireActuelle());
  const [liste, setListe] = useState(() => [anneeScolaireActuelle()]);

  const rafraichir = useCallback(async () => {
    try {
      const donnees = await api('/annees');
      setActuelle(donnees.actuelle);
      setListe(donnees.liste);
    } catch {
      /* pas grave : on garde la liste locale, l'app reste utilisable */
    }
  }, []);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  const setAnnee = useCallback((valeur) => {
    setAnneeEtat(valeur);
    localStorage.setItem(CLE, valeur);
  }, []);

  // L'année à utiliser pour créer une donnée (jamais "toutes")
  const anneePourEcriture = annee === TOUTES_ANNEES ? actuelle : annee;

  const valeur = useMemo(
    () => ({
      annee,
      setAnnee,
      actuelle,
      liste,
      toutes: annee === TOUTES_ANNEES,
      anneePourEcriture,
      rafraichir,
    }),
    [annee, setAnnee, actuelle, liste, anneePourEcriture, rafraichir]
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useAnneeScolaire() {
  const ctx = useContext(Contexte);
  if (!ctx) throw new Error('useAnneeScolaire doit être appelé dans AnneeScolaireProvider.');
  return ctx;
}
