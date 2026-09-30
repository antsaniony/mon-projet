import Modal from './Modal.jsx';

export default function ConfirmModal({
  titre,
  children,
  texteConfirmer = 'Confirmer',
  danger = false,
  onConfirmer,
  onFermer,
}) {
  return (
    <Modal title={titre} onClose={onFermer} width="420px">
      <p className="confirmation-texte">{children}</p>
      <div className="actions">
        <button type="button" className="bouton secondaire" onClick={onFermer}>
          Annuler
        </button>
        <button
          type="button"
          className={danger ? 'bouton danger' : 'bouton'}
          onClick={onConfirmer}
        >
          {texteConfirmer}
        </button>
      </div>
    </Modal>
  );
}
