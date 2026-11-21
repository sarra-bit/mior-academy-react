import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Formations from './pages/Formations.jsx';
import FormationDetail from './pages/FormationDetail.jsx';
import Sessions from './pages/Sessions.jsx';
import InscriptionSession from './pages/InscriptionSession.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MesInscriptions from './pages/MesInscriptions.jsx';
import Profil from './pages/Profil.jsx';
import NotFound from './pages/NotFound.jsx';
import FormateurLayout from './pages/formateur/FormateurLayout.jsx';
import FormateurSessions from './pages/formateur/FormateurSessions.jsx';
import FormateurAppel from './pages/formateur/FormateurAppel.jsx';
import FormateurDisponibilites from './pages/formateur/FormateurDisponibilites.jsx';
import FormateurFormations from './pages/formateur/FormateurFormations.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminFormations from './pages/admin/AdminFormations.jsx';
import AdminFormateurs from './pages/admin/AdminFormateurs.jsx';
import AdminSessions from './pages/admin/AdminSessions.jsx';
import AdminGroupes from './pages/admin/AdminGroupes.jsx';
import AdminInscriptions from './pages/admin/AdminInscriptions.jsx';
import AdminComptes from './pages/admin/AdminComptes.jsx';
import AdminAttestations from './pages/admin/AdminAttestations.jsx';
import AdminPresences from './pages/admin/AdminPresences.jsx';
import MesAttestations from './pages/MesAttestations.jsx';
import MesAlertes from './pages/MesAlertes.jsx';
import Messages from './pages/Messages.jsx';
import Verifier from './pages/Verifier.jsx';

const prive = (el, roles) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/formations" element={<Formations />} />
        <Route path="/formations/:id" element={<FormationDetail />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Register />} />
        <Route path="/verifier" element={<Verifier />} />
        <Route path="/verifier/:code" element={<Verifier />} />

        {/* Tous les utilisateurs connectés */}
        <Route path="/espace" element={prive(<Dashboard />)} />
        <Route path="/espace/profil" element={prive(<Profil />)} />

        {/* Participant */}
        <Route path="/sessions/:id/inscription" element={prive(<InscriptionSession />, ['participant'])} />
        <Route path="/espace/inscriptions" element={prive(<MesInscriptions />, ['participant'])} />
        <Route path="/espace/attestations" element={prive(<MesAttestations />, ['participant'])} />
        <Route path="/espace/alertes" element={prive(<MesAlertes />, ['participant'])} />
        <Route path="/espace/messages" element={prive(<Messages />, ['participant'])} />
        <Route path="/espace/messages/:id" element={prive(<Messages />, ['participant'])} />

        {/* Formateur */}
        <Route path="/formateur" element={prive(<FormateurLayout />, ['formateur'])}>
          <Route index element={<Navigate to="/formateur/sessions" replace />} />
          <Route path="sessions" element={<FormateurSessions />} />
          <Route path="sessions/:id/appel" element={<FormateurAppel />} />
          <Route path="disponibilites" element={<FormateurDisponibilites />} />
          <Route path="formations" element={<FormateurFormations />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:id" element={<Messages />} />
          <Route path="attestations" element={<MesAttestations />} />
        </Route>

        {/* Administration */}
        <Route path="/admin" element={prive(<AdminLayout />, ['admin'])}>
          <Route index element={<Navigate to="/admin/inscriptions" replace />} />
          <Route path="inscriptions" element={<AdminInscriptions />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="sessions/:id/groupes" element={<AdminGroupes />} />
          <Route path="formations" element={<AdminFormations />} />
          <Route path="formateurs" element={<AdminFormateurs />} />
          <Route path="comptes" element={<AdminComptes />} />
          <Route path="presences" element={<AdminPresences />} />
          <Route path="attestations" element={<AdminAttestations />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
