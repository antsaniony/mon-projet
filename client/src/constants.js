export const CLASSES = ['6e', '5e', '4e', '3e', '2nd', 'Terminale'];

export const TOUTES_ANNEES = 'toutes';

export const REGEX_ANNEE = /^\d{4}-\d{4}$/;

export function anneeValide(valeur) {
  if (!REGEX_ANNEE.test(valeur)) return false;
  const [a, b] = valeur.split('-').map(Number);
  return b === a + 1;
}

// La rentrée administrative démarre en août : avant ça, on est encore
// sur l'année scolaire précédente. Doit rester cohérent avec le serveur.
export function anneeScolaireActuelle(date = new Date()) {
  const annee = date.getFullYear();
  const mois = date.getMonth(); // 0 = janvier ... 7 = août
  const debut = mois >= 7 ? annee : annee - 1;
  return `${debut}-${debut + 1}`;
}
