-- =====================================================================
--  Copie des données de l'ancienne base « centre_de_formation »
--  vers la nouvelle base « mior_academy ».
--
--  À exécuter APRÈS schema.sql, sur le même serveur MySQL.
--  L'ancienne base n'est pas modifiée (lecture seule).
--  Les identifiants (id) sont conservés.
--  INSERT IGNORE : les lignes orphelines (qui pointent vers un id
--  inexistant) sont ignorées au lieu de bloquer la copie.
-- =====================================================================
USE mior_academy;

INSERT IGNORE INTO compte (id, nom, prenom, date_naissance, sexe, telephone, photo, email, motdepasse, role, statut)
SELECT ID, nom, prenom, date_naissance,
       IF(sexe IN ('homme','femme'), sexe, NULL),
       telephone, photo, email, motdepasse, role, COALESCE(statut, 1)
FROM centre_de_formation.compte
WHERE role IN ('admin','formateur','participant') AND email IS NOT NULL AND email <> '';

INSERT IGNORE INTO formateur (id, compte_id, specialite)
SELECT id, compte_id, specialite FROM centre_de_formation.formateur;

INSERT IGNORE INTO formation (id, titre, description, duree, prix, competences, prerequis,
                              departement, categorie, type_paiement, montant_avance, nb_places)
SELECT id, titre, description, duree, COALESCE(prix, 0), competences, prerequis,
       departement, categorie, COALESCE(type_paiement, 'complet'), montant_avance, COALESCE(nb_places, 20)
FROM centre_de_formation.formataion;

INSERT IGNORE INTO formateur_formation (id, formateur_id, formation_id)
SELECT id, formateur_id, formation_id FROM centre_de_formation.formateur_formation;

INSERT IGNORE INTO documents_formation (id, formation_id, titre, lien)
SELECT id, formation_id, titre, lien FROM centre_de_formation.documents_formation;

INSERT IGNORE INTO session_formation (id, formation_id, formateur_id, date_session, heure_debut, heure_fin,
                                      salle, statut, nb_places, nb_places_restantes)
SELECT id, formation_id, formateur_id, date_session, heure_debut, heure_fin, salle,
       IF(statut IN ('Planifiée','En cours','Terminée','Annulée'), statut, 'Planifiée'),
       COALESCE(nb_places, 20), COALESCE(nb_places_restantes, nb_places, 20)
FROM centre_de_formation.session_formation;

INSERT IGNORE INTO inscriptions (id, participant_id, session_id, date_inscription, statut_inscription,
                                 statut_paiement, nom_payeur, prenom_payeur, email_payeur, telephone_payeur,
                                 mode_paiement, reference_paiement, montant_a_payer, montant_paye)
SELECT id, participant_id, session_id, COALESCE(date_inscription, NOW()),
       COALESCE(statut_inscription, 'en_attente'), COALESCE(statut_paiement, 'en_attente'),
       nom_payeur, prenom_payeur, email_payeur, telephone_payeur, mode_paiement, reference_paiement,
       montant_a_payer, COALESCE(montant_paye, 0)
FROM centre_de_formation.inscriptions;

INSERT IGNORE INTO groupes (id, session_id, nom_groupe, description, date_creation)
SELECT id, session_id, nom_groupe, description, COALESCE(date_creation, NOW())
FROM centre_de_formation.groupes;

INSERT IGNORE INTO groupe_participants (id, groupe_id, participant_id, date_affectation)
SELECT id, groupe_id, participant_id, COALESCE(date_affectation, NOW())
FROM centre_de_formation.groupe_participants;

INSERT IGNORE INTO groupe_sessions (id, groupe_id, session_id, created_at)
SELECT id, groupe_id, session_id, COALESCE(created_at, NOW())
FROM centre_de_formation.groupe_sessions;

INSERT IGNORE INTO presences (id, session_id, groupe_id, participant_id, statut_presence, remarque, date_saisie)
SELECT id, session_id, groupe_id, participant_id, statut_presence, remarque, COALESCE(date_saisie, NOW())
FROM centre_de_formation.presences;

INSERT IGNORE INTO alertes_absence (id, participant_id, message, date_alerte, statut)
SELECT id, participant_id, COALESCE(message, ''), COALESCE(date_alerte, NOW()), COALESCE(statut, 'non_lue')
FROM centre_de_formation.alertes_absence;

INSERT IGNORE INTO attestation (id, code_unique, compte_id, session_id, type, qr_code, date_generation)
SELECT id, code_unique, compte_id, session_id, type, qr_code, COALESCE(date_generation, NOW())
FROM centre_de_formation.attestation;

INSERT IGNORE INTO disponibilite_formateur (id, formateur_id, jour, heure_debut, heure_fin, statut)
SELECT id, formateur_id, jour, heure_debut, heure_fin,
       IF(statut IN ('Disponible','Indisponible'), statut, 'Disponible')
FROM centre_de_formation.disponibilite_formateur;

INSERT IGNORE INTO conversations (id, participant_id, formateur_id, formation_id, session_id, created_at)
SELECT id, participant_id, formateur_id, formation_id, session_id, COALESCE(created_at, NOW())
FROM centre_de_formation.conversations;

INSERT IGNORE INTO messages (id, conversation_id, sender_id, sender_role, message, file_path, is_read, created_at)
SELECT id, conversation_id, sender_id, sender_role, message, file_path, COALESCE(is_read, 0), COALESCE(created_at, NOW())
FROM centre_de_formation.messages;
