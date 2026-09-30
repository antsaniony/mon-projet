import { CLASSES } from '../constants';

export default function ClassTabs({ value, onChange }) {
  return (
    <div className="onglets" role="tablist" aria-label="Classe">
      {CLASSES.map((c) => (
        <button
          key={c}
          type="button"
          role="tab"
          aria-selected={value === c}
          className={value === c ? 'onglet actif' : 'onglet'}
          onClick={() => onChange(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
