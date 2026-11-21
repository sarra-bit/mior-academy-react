const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const pool = require('../db');

// Code public imprimé sur l'attestation (ex. ATT-3F9A0C12B7E4)
const genererCode = () => `ATT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

// Lien de vérification encodé dans le QR code (page publique du site React)
const urlVerification = (code) =>
  `${(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')}/verifier/${encodeURIComponent(code)}`;

// Toutes les informations nécessaires pour afficher / imprimer une attestation
async function trouverAttestation(where, params) {
  const [[a]] = await pool.query(
    `SELECT a.id, a.code_unique, a.compte_id, a.session_id, a.type, a.date_generation,
            b.nom AS beneficiaire_nom, b.prenom AS beneficiaire_prenom,
            f.titre AS formation_titre, f.departement, f.duree,
            s.date_session, s.heure_debut, s.heure_fin, s.salle,
            fc.nom AS formateur_nom, fc.prenom AS formateur_prenom
     FROM attestation a
     JOIN compte b ON b.id = a.compte_id
     JOIN session_formation s ON s.id = a.session_id
     JOIN formation f ON f.id = s.formation_id
     LEFT JOIN formateur fo ON fo.id = s.formateur_id
     LEFT JOIN compte fc ON fc.id = fo.compte_id
     WHERE ${where}`,
    params
  );
  return a || null;
}

const dateFr = (d) =>
  new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

// Écrit le PDF de l'attestation directement dans la réponse HTTP
async function envoyerPdf(a, res) {
  const qr = await QRCode.toBuffer(urlVerification(a.code_unique), { margin: 1, width: 300 });
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, info: { Title: `Attestation ${a.code_unique}` } });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="attestation_${a.code_unique}.pdf"`);
  doc.pipe(res);

  const W = doc.page.width;
  const H = doc.page.height;
  const INK = '#1a2e52';
  const GOLD = '#f5921e';
  const MUTED = '#5b6b7f';

  doc.rect(0, 0, W, H).fill('#fbf8f1');
  doc.lineWidth(3).strokeColor(GOLD).rect(24, 24, W - 48, H - 48).stroke();
  doc.lineWidth(1).strokeColor(INK).rect(34, 34, W - 68, H - 68).stroke();

  doc.fillColor(INK).font('Helvetica-Bold').fontSize(16).text('M.I.O.R ACADEMY', 0, 62, { align: 'center', characterSpacing: 3 });
  doc.fillColor(MUTED).font('Helvetica').fontSize(10).text('Centre de formation professionnelle - Tunis', { align: 'center' });

  const titre = a.type === 'formateur' ? "ATTESTATION D'ANIMATION" : 'ATTESTATION DE PARTICIPATION';
  doc.moveDown(1.6).fillColor(GOLD).font('Helvetica-Bold').fontSize(30).text(titre, { align: 'center' });

  doc.moveDown(1).fillColor(INK).font('Helvetica').fontSize(13).text('Nous certifions que', { align: 'center' });
  doc.moveDown(0.5).font('Helvetica-Bold').fontSize(26)
    .text(`${a.beneficiaire_prenom || ''} ${a.beneficiaire_nom || ''}`.trim(), { align: 'center' });

  const action = a.type === 'formateur'
    ? 'a animé en qualité de formateur la session de formation'
    : 'a suivi la session de formation';
  doc.moveDown(0.6).font('Helvetica').fontSize(13).text(action, { align: 'center' });
  doc.moveDown(0.4).font('Helvetica-Bold').fontSize(18).fillColor(INK).text(`« ${a.formation_titre} »`, { align: 'center' });

  const details = [
    `le ${dateFr(a.date_session)}, de ${String(a.heure_debut).slice(0, 5)} à ${String(a.heure_fin).slice(0, 5)}`,
    a.salle ? `salle ${a.salle}` : null,
    a.type === 'participant' && a.formateur_nom ? `formateur : ${a.formateur_prenom} ${a.formateur_nom}` : null,
  ].filter(Boolean).join('  -  ');
  doc.moveDown(0.6).font('Helvetica').fontSize(12).fillColor(MUTED).text(details, { align: 'center' });

  // Bas de page : code + date à gauche, signature au centre, QR code à droite
  const yBas = H - 150;
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text('Code de vérification', 70, yBas + 20);
  doc.font('Courier-Bold').fontSize(14).text(a.code_unique, 70, yBas + 36);
  doc.font('Helvetica').fontSize(10).fillColor(MUTED)
    .text(`Délivrée le ${dateFr(a.date_generation)}`, 70, yBas + 58)
    .text("Scannez le QR code pour vérifier l'authenticité de ce document.", 70, yBas + 72);

  doc.image(qr, W - 70 - 100, yBas, { width: 100 });

  doc.moveTo(W / 2 + 30, yBas + 70).lineTo(W / 2 + 200, yBas + 70).lineWidth(0.8).strokeColor(MUTED).stroke();
  doc.fillColor(MUTED).fontSize(10).text('La direction', W / 2 + 30, yBas + 76, { width: 170, align: 'center' });

  doc.end();
}

module.exports = { genererCode, urlVerification, trouverAttestation, envoyerPdf };
