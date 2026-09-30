import { NavLink } from 'react-router-dom';
import {
  IconeTableauDeBord,
  IconeCalendrier,
  IconeEleves,
  IconeLivre,
  IconeEmploiDuTemps,
  IconeProgramme,
  IconeClavier,
  IconeDeconnexion,
} from './icones.jsx';

export default function Layout({ children, onDeconnexion }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="marque">Registre</div>
        <nav className="nav" aria-label="Navigation principale">
          <NavLink to="/" end>
            <IconeTableauDeBord />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/annee-scolaire">
            <IconeCalendrier />
            <span>Année scolaire</span>
          </NavLink>
          <NavLink to="/eleves">
            <IconeEleves />
            <span>Élèves</span>
          </NavLink>
          <NavLink to="/paiements">
            <IconeLivre />
            <span>Paiement de livre</span>
          </NavLink>
          <NavLink to="/emploi-du-temps">
            <IconeEmploiDuTemps />
            <span>Emploi du temps</span>
          </NavLink>
          <NavLink to="/programmes">
            <IconeProgramme />
            <span>Programmes</span>
          </NavLink>
          <NavLink to="/dactylographie">
            <IconeClavier />
            <span>Dactylographie</span>
          </NavLink>
        </nav>
        <button type="button" className="deconnexion" onClick={onDeconnexion}>
          <IconeDeconnexion />
          <span>Se déconnecter</span>
        </button>
      </aside>
      <main className="contenu">{children}</main>
    </div>
  );
}