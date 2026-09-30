import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { pool, dbConfig, DB_NAME } from './db.js';
import { CLASSES, anneeScolaireActuelle } from './constants.js';

async function colonneExiste(table, colonne) {
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_NAME, table, colonne]
  );
  return total > 0;
}

async function indexExiste(table, nomIndex) {
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [DB_NAME, table, nomIndex]
  );
  return total > 0;
}

export async function init() {
  // 1. Crée la base si elle n'existe pas
  const conn = await mysql.createConnection(dbConfig);
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.end();

  // 2. Crée les tables (installation neuve)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS utilisateurs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      identifiant VARCHAR(60) NOT NULL UNIQUE,
      mot_de_passe VARCHAR(255) NOT NULL,
      cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const classes = CLASSES.map((c) => `'${c}'`).join(',');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS eleves (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nom VARCHAR(100) NOT NULL,
      prenom VARCHAR(100) NOT NULL,
      date_naissance DATE NULL,
      classe ENUM(${classes}) NOT NULL,
      annee_scolaire VARCHAR(9) NOT NULL,
      numero TINYINT UNSIGNED NOT NULL,
      a_paye TINYINT(1) NOT NULL DEFAULT 0,
      date_paiement DATETIME NULL,
      cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_classe_numero_annee (classe, numero, annee_scolaire)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS emploi_du_temps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      classe ENUM(${classes}) NOT NULL,
      annee_scolaire VARCHAR(9) NOT NULL,
      jour ENUM('Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi') NOT NULL,
      heure_debut TIME NOT NULL,
      heure_fin TIME NOT NULL,
      matiere VARCHAR(100) NOT NULL,
      enseignant VARCHAR(100) NULL,
      salle VARCHAR(50) NULL,
      cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS programmes_avancement (
      id INT AUTO_INCREMENT PRIMARY KEY,
      classe ENUM(${classes}) NOT NULL,
      annee_scolaire VARCHAR(9) NOT NULL,
      trimestre_index TINYINT UNSIGNED NOT NULL,
      chapitre_index TINYINT UNSIGNED NOT NULL,
      fait TINYINT(1) NOT NULL DEFAULT 0,
      maj_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_avancement (classe, annee_scolaire, trimestre_index, chapitre_index)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dactylographie (
      id INT AUTO_INCREMENT PRIMARY KEY,
      eleve_id INT NOT NULL,
      classe ENUM(${classes}) NOT NULL,
      annee_scolaire VARCHAR(9) NOT NULL,
      numero TINYINT UNSIGNED NOT NULL,
      cpm SMALLINT UNSIGNED NOT NULL,
      note DECIMAL(4,2) NOT NULL,
      cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      maj_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_eleve_annee (eleve_id, annee_scolaire),
      KEY idx_classe_annee (classe, annee_scolaire),
      CONSTRAINT fk_dactylo_eleve FOREIGN KEY (eleve_id) REFERENCES eleves(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 3. Migration pour les bases déjà en place avant l'ajout de l'année scolaire
  const aDejaLaColonne = await colonneExiste('eleves', 'annee_scolaire');
  if (!aDejaLaColonne) {
    const anneeParDefaut = anneeScolaireActuelle();
    console.log(
      `Migration : ajout de la colonne annee_scolaire (élèves existants affectés à ${anneeParDefaut}).`
    );
    await pool.query(
      `ALTER TABLE eleves ADD COLUMN annee_scolaire VARCHAR(9) NOT NULL DEFAULT '${anneeParDefaut}' AFTER classe`
    );

    if (await indexExiste('eleves', 'uniq_classe_numero')) {
      await pool.query('ALTER TABLE eleves DROP INDEX uniq_classe_numero');
    }
    if (!(await indexExiste('eleves', 'uniq_classe_numero_annee'))) {
      await pool.query(
        'ALTER TABLE eleves ADD UNIQUE KEY uniq_classe_numero_annee (classe, numero, annee_scolaire)'
      );
    }
  }

  // 3bis. Migration pour les bases déjà en place avant l'ajout de la date de naissance
  const aDejaLaDateNaissance = await colonneExiste('eleves', 'date_naissance');
  if (!aDejaLaDateNaissance) {
    console.log('Migration : ajout de la colonne date_naissance (vide pour les élèves existants).');
    await pool.query('ALTER TABLE eleves ADD COLUMN date_naissance DATE NULL AFTER prenom');
  }

  // 4. Crée le compte administrateur si aucun compte n'existe
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM utilisateurs');
  if (total === 0) {
    const identifiant = process.env.ADMIN_IDENTIFIANT || 'admin';
    const motDePasse = process.env.ADMIN_MOT_DE_PASSE || 'admin1234';
    const hash = await bcrypt.hash(motDePasse, 10);
    await pool.query('INSERT INTO utilisateurs (identifiant, mot_de_passe) VALUES (?, ?)', [
      identifiant,
      hash,
    ]);
    console.log(`Compte créé : identifiant "${identifiant}"`);
  }
}
