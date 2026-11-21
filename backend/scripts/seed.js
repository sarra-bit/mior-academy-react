// Données de démonstration pour une base vide (ex. un membre de l'équipe qui n'a pas l'ancienne base).
// Usage : npm run seed   (après avoir exécuté database/schema.sql)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/db');

async function main() {
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM compte');
  if (total > 0) {
    console.log(`La base contient déjà ${total} compte(s) : seed ignoré.`);
    return;
  }

  const hash = await bcrypt.hash('demo1234', 10);
  const comptes = [
    ['Admin', 'Mior', 'admin@mioracademy.tn', 'admin'],
    ['Ben Ali', 'Sami', 'formateur@mioracademy.tn', 'formateur'],
    ['Trabelsi', 'Amira', 'participant@mioracademy.tn', 'participant'],
  ];
  const ids = {};
  for (const [nom, prenom, email, role] of comptes) {
    const [r] = await pool.query(
      `INSERT INTO compte (nom, prenom, email, telephone, motdepasse, role) VALUES (?, ?, ?, '20000000', ?, ?)`,
      [nom, prenom, email, hash, role]
    );
    ids[role] = r.insertId;
  }
  const [fo] = await pool.query("INSERT INTO formateur (compte_id, specialite) VALUES (?, 'Développement web')", [ids.formateur]);

  const formations = [
    ['Développement Web Full Stack', 'HTML, CSS, JavaScript, React et Node.js.', 120, 900, 'Informatique', 'Développement'],
    ['Marketing Digital', 'Réseaux sociaux, SEO et publicité en ligne.', 60, 450, 'Marketing & Digital', 'Compétences Digitales'],
    ['Anglais professionnel', 'Communication orale et écrite en entreprise.', 40, 300, 'Langues', 'Langues & Communication'],
    ['Photoshop & Illustrator', 'Création graphique et identité visuelle.', 50, 400, 'Design & Multimédia', 'Multimédia Créatif'],
  ];
  for (const [titre, description, duree, prix, departement, categorie] of formations) {
    const [f] = await pool.query(
      'INSERT INTO formation (titre, description, duree, prix, departement, categorie) VALUES (?, ?, ?, ?, ?, ?)',
      [titre, description, duree, prix, departement, categorie]
    );
    await pool.query('INSERT INTO formateur_formation (formateur_id, formation_id) VALUES (?, ?)', [fo.insertId, f.insertId]);
    await pool.query(
      `INSERT INTO session_formation (formation_id, formateur_id, date_session, heure_debut, heure_fin, salle, nb_places, nb_places_restantes)
       VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL 14 DAY), '09:00', '12:00', 'Salle A', 20, 20)`,
      [f.insertId, fo.insertId]
    );
  }
  console.log('Seed terminé. Comptes de démo (mot de passe : demo1234) :');
  comptes.forEach(([, , email, role]) => console.log(`  ${role.padEnd(12)} ${email}`));
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
