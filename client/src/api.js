const CLE = 'registre_token';

export const getToken = () => localStorage.getItem(CLE);
export const setToken = (t) => localStorage.setItem(CLE, t);
export const clearToken = () => localStorage.removeItem(CLE);

export async function api(chemin, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(`/api${chemin}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let donnees = null;
  try {
    donnees = await res.json();
  } catch {
    /* réponse vide (204) */
  }

  if (!res.ok) {
    if (res.status === 401 && chemin !== '/auth/login') {
      clearToken();
      window.dispatchEvent(new Event('auth:deconnexion'));
    }
    throw new Error(donnees?.message || 'Une erreur est survenue. Réessayez.');
  }
  return donnees;
}
