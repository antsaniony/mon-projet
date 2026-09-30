// Modal volontairement sans fermeture au clic sur le fond ni via la touche
// Échap : elle ne doit disparaître que par une action explicite (le bouton
// de fermeture), pour éviter de perdre une saisie par erreur.
export default function Modal({ title, onClose, children, width = '560px' }) {
  return (
    <div className="modal-fond" role="presentation">
      <div
        className="modal-panneau"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: width }}
      >
        <div className="modal-entete">
          <h2>{title}</h2>
          <button type="button" className="modal-fermer" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="modal-corps">{children}</div>
      </div>
    </div>
  );
}
