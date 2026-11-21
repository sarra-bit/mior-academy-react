-- =====================================================================
--  M.I.O.R Academy — schéma de la base (version React + Node.js)
--  Base : mior_academy  (MySQL 8 / MariaDB 10.4+)
--
--  Corrections par rapport à l'ancienne base « centre_de_formation » :
--   - table `formataion`  ->  `formation`
--   - `compte.ID`         ->  `compte.id`
--   - rôles et statuts en ENUM, mot de passe en VARCHAR(255)
--   - clés étrangères ajoutées partout (inscriptions, messages, ...)
--   - utf8mb4 pour les accents et les emojis
-- =====================================================================

CREATE DATABASE IF NOT EXISTS mior_academy
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mior_academy;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS messages, conversations, documents_formation, disponibilite_formateur,
  attestation, alertes_absence, presences, groupe_sessions, groupe_participants, groupes,
  inscriptions, session_formation, formateur_formation, formateur, formation, compte;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Comptes (admin, formateur, participant)
-- ---------------------------------------------------------------------
CREATE TABLE compte (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nom             VARCHAR(50)  NOT NULL,
  prenom          VARCHAR(50)  NOT NULL,
  date_naissance  DATE NULL,
  sexe            ENUM('homme','femme') NULL,
  telephone       VARCHAR(20)  NULL,
  photo           VARCHAR(255) NULL,
  email           VARCHAR(120) NOT NULL UNIQUE,
  motdepasse      VARCHAR(255) NOT NULL,
  role            ENUM('admin','formateur','participant') NOT NULL DEFAULT 'participant',
  statut          TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE formateur (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  compte_id   INT NOT NULL UNIQUE,
  specialite  VARCHAR(150) NULL,
  CONSTRAINT fk_formateur_compte FOREIGN KEY (compte_id) REFERENCES compte(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Formations
-- ---------------------------------------------------------------------
CREATE TABLE formation (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  titre           VARCHAR(255) NOT NULL,
  description     TEXT NULL,
  duree           INT NULL COMMENT 'en heures',
  prix            DECIMAL(10,2) NOT NULL DEFAULT 0,
  competences     TEXT NULL,
  prerequis       TEXT NULL,
  departement     VARCHAR(100) NULL,
  categorie       VARCHAR(100) NULL,
  type_paiement   ENUM('complet','avance') NOT NULL DEFAULT 'complet',
  montant_avance  DECIMAL(10,2) NULL,
  nb_places       INT NOT NULL DEFAULT 20,
  INDEX idx_formation_departement (departement),
  INDEX idx_formation_categorie (categorie)
) ENGINE=InnoDB;

CREATE TABLE formateur_formation (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  formateur_id  INT NOT NULL,
  formation_id  INT NOT NULL,
  UNIQUE KEY uq_formateur_formation (formateur_id, formation_id),
  CONSTRAINT fk_ff_formateur FOREIGN KEY (formateur_id) REFERENCES formateur(id) ON DELETE CASCADE,
  CONSTRAINT fk_ff_formation FOREIGN KEY (formation_id) REFERENCES formation(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE documents_formation (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  formation_id  INT NOT NULL,
  titre         VARCHAR(255) NOT NULL,
  lien          VARCHAR(500) NOT NULL,
  CONSTRAINT fk_doc_formation FOREIGN KEY (formation_id) REFERENCES formation(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Sessions, groupes, inscriptions
-- ---------------------------------------------------------------------
CREATE TABLE session_formation (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  formation_id         INT NOT NULL,
  formateur_id         INT NULL,
  date_session         DATE NOT NULL,
  heure_debut          TIME NOT NULL,
  heure_fin            TIME NOT NULL,
  salle                VARCHAR(100) NULL,
  statut               ENUM('Planifiée','En cours','Terminée','Annulée') NOT NULL DEFAULT 'Planifiée',
  nb_places            INT NOT NULL DEFAULT 20,
  nb_places_restantes  INT NOT NULL DEFAULT 20,
  CONSTRAINT fk_session_formation FOREIGN KEY (formation_id) REFERENCES formation(id) ON DELETE CASCADE,
  CONSTRAINT fk_session_formateur FOREIGN KEY (formateur_id) REFERENCES formateur(id) ON DELETE SET NULL,
  INDEX idx_session_date (date_session)
) ENGINE=InnoDB;

CREATE TABLE inscriptions (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  participant_id      INT NOT NULL COMMENT 'compte.id',
  session_id          INT NOT NULL,
  date_inscription    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  statut_inscription  ENUM('en_attente','confirmee','refusee') NOT NULL DEFAULT 'en_attente',
  statut_paiement     ENUM('en_attente','avance_payee','paye','refuse') NOT NULL DEFAULT 'en_attente',
  nom_payeur          VARCHAR(100) NULL,
  prenom_payeur       VARCHAR(100) NULL,
  email_payeur        VARCHAR(150) NULL,
  telephone_payeur    VARCHAR(30)  NULL,
  mode_paiement       VARCHAR(50)  NULL,
  reference_paiement  VARCHAR(100) NULL,
  montant_a_payer     DECIMAL(10,2) NULL,
  montant_paye        DECIMAL(10,2) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_inscription (participant_id, session_id),
  CONSTRAINT fk_insc_participant FOREIGN KEY (participant_id) REFERENCES compte(id) ON DELETE CASCADE,
  CONSTRAINT fk_insc_session FOREIGN KEY (session_id) REFERENCES session_formation(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE groupes (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  session_id     INT NOT NULL,
  nom_groupe     VARCHAR(100) NOT NULL,
  description    TEXT NULL,
  date_creation  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_groupe_session FOREIGN KEY (session_id) REFERENCES session_formation(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE groupe_participants (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  groupe_id         INT NOT NULL,
  participant_id    INT NOT NULL COMMENT 'compte.id',
  date_affectation  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_groupe_participant (groupe_id, participant_id),
  CONSTRAINT fk_gp_groupe FOREIGN KEY (groupe_id) REFERENCES groupes(id) ON DELETE CASCADE,
  CONSTRAINT fk_gp_participant FOREIGN KEY (participant_id) REFERENCES compte(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE groupe_sessions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  groupe_id   INT NOT NULL,
  session_id  INT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gs_groupe FOREIGN KEY (groupe_id) REFERENCES groupes(id) ON DELETE CASCADE,
  CONSTRAINT fk_gs_session FOREIGN KEY (session_id) REFERENCES session_formation(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Présences et alertes
-- ---------------------------------------------------------------------
CREATE TABLE presences (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  session_id       INT NOT NULL,
  groupe_id        INT NULL,
  participant_id   INT NOT NULL COMMENT 'compte.id',
  statut_presence  ENUM('present','absent','retard','excuse') NOT NULL,
  remarque         TEXT NULL,
  date_saisie      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_presence (session_id, participant_id),
  CONSTRAINT fk_pres_session FOREIGN KEY (session_id) REFERENCES session_formation(id) ON DELETE CASCADE,
  CONSTRAINT fk_pres_groupe FOREIGN KEY (groupe_id) REFERENCES groupes(id) ON DELETE SET NULL,
  CONSTRAINT fk_pres_participant FOREIGN KEY (participant_id) REFERENCES compte(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE alertes_absence (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  participant_id  INT NOT NULL COMMENT 'compte.id',
  message         TEXT NOT NULL,
  date_alerte     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  statut          ENUM('non_lue','lue') NOT NULL DEFAULT 'non_lue',
  CONSTRAINT fk_alerte_participant FOREIGN KEY (participant_id) REFERENCES compte(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Attestations
-- ---------------------------------------------------------------------
CREATE TABLE attestation (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  code_unique      VARCHAR(100) NOT NULL UNIQUE,
  compte_id        INT NOT NULL,
  session_id       INT NOT NULL,
  type             ENUM('participant','formateur') NOT NULL,
  qr_code          VARCHAR(255) NULL,
  date_generation  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_att_compte FOREIGN KEY (compte_id) REFERENCES compte(id) ON DELETE CASCADE,
  CONSTRAINT fk_att_session FOREIGN KEY (session_id) REFERENCES session_formation(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Disponibilités des formateurs
-- ---------------------------------------------------------------------
CREATE TABLE disponibilite_formateur (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  formateur_id  INT NOT NULL,
  jour          ENUM('Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche') NOT NULL,
  heure_debut   TIME NOT NULL,
  heure_fin     TIME NOT NULL,
  statut        ENUM('Disponible','Indisponible') NOT NULL DEFAULT 'Disponible',
  CONSTRAINT fk_dispo_formateur FOREIGN KEY (formateur_id) REFERENCES formateur(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Messagerie participant <-> formateur
-- ---------------------------------------------------------------------
CREATE TABLE conversations (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  participant_id  INT NOT NULL COMMENT 'compte.id',
  formateur_id    INT NOT NULL COMMENT 'compte.id du formateur',
  formation_id    INT NULL,
  session_id      INT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_conv_participant FOREIGN KEY (participant_id) REFERENCES compte(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_formateur FOREIGN KEY (formateur_id) REFERENCES compte(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_formation FOREIGN KEY (formation_id) REFERENCES formation(id) ON DELETE SET NULL,
  CONSTRAINT fk_conv_session FOREIGN KEY (session_id) REFERENCES session_formation(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE messages (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id  INT NOT NULL,
  sender_id        INT NOT NULL COMMENT 'compte.id',
  sender_role      ENUM('participant','formateur') NOT NULL,
  message          TEXT NULL,
  file_path        VARCHAR(255) NULL,
  is_read          TINYINT(1) NOT NULL DEFAULT 0,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES compte(id) ON DELETE CASCADE
) ENGINE=InnoDB;
