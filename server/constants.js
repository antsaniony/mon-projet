export const CLASSES = ['6e', '5e', '4e', '3e', '2nd', 'Terminale'];

export const REGEX_ANNEE = /^\d{4}-\d{4}$/;
export const REGEX_DATE = /^\d{4}-\d{2}-\d{2}$/;

// La rentrée administrative démarre en août : avant ça, on est encore
// sur l'année scolaire précédente.
export function anneeScolaireActuelle(date = new Date()) {
  const annee = date.getFullYear();
  const mois = date.getMonth(); // 0 = janvier ... 7 = août
  const debut = mois >= 7 ? annee : annee - 1;
  return `${debut}-${debut + 1}`;
}

export function anneeValide(valeur) {
  if (typeof valeur !== 'string' || !REGEX_ANNEE.test(valeur)) return false;
  const [a, b] = valeur.split('-').map(Number);
  return b === a + 1;
}

export function dateNaissanceValide(valeur) {
  if (typeof valeur !== 'string' || !REGEX_DATE.test(valeur)) return false;
  const d = new Date(`${valeur}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() <= Date.now();
}
