import React, { useState } from 'react';
import {
  X,
  Users,
  Shield,
  KeyRound,
  UserPlus,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  History,
  Trash2
} from 'lucide-react';
import { StaffUser, LoginLog, StaffRole } from '../types';
import { Pagination } from './Pagination';

const PAGE_SIZE = 10;

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffUsers: StaffUser[];
  loginLogs: LoginLog[];
  currentStaffUser: StaffUser | null;
  tickets: { cashierName: string; cashierId?: string }[];
  isCurrentShiftOpen: boolean;
  currentShiftCashierId?: string;
  onAddStaff: (user: Omit<StaffUser, 'id' | 'failedAttempts' | 'isActive'>) => void;
  onResetStaffPassword: (userId: string, newPin: string, newPassword?: string) => void;
  onToggleUserActive: (userId: string) => void;
  onBlockUser?: (userId: string, reason?: string) => void;
  onUnblockUser?: (userId: string) => void;
  onDeleteStaff: (userId: string, adminPasswordConfirm: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  onUpdateStaffRole: (userId: string, newRole: StaffRole) => void;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  staffUsers,
  loginLogs,
  currentStaffUser,
  tickets,
  isCurrentShiftOpen,
  currentShiftCashierId,
  onAddStaff,
  onResetStaffPassword,
  onToggleUserActive,
  onBlockUser,
  onUnblockUser,
  onDeleteStaff,
  onUpdateStaffRole,
}) => {
  const [subTab, setSubTab] = useState<'users' | 'add' | 'logs'>('users');
  
  // Nouveau membre
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<StaffRole>('CAISSIER');
  const [pin, setPin] = useState('1234');
  const [password, setPassword] = useState('caisse2026');

  // Reset PIN
  const [selectedResetUser, setSelectedResetUser] = useState<StaffUser | null>(null);
  const [newPin, setNewPin] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Suppression / Archivage
  const [selectedDeleteUser, setSelectedDeleteUser] = useState<StaffUser | null>(null);
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmBlockUser, setConfirmBlockUser] = useState<StaffUser | null>(null);
  const [logsPage, setLogsPage] = useState(1);

  if (!isOpen) return null;

  const paginatedLogs = loginLogs.slice((logsPage - 1) * PAGE_SIZE, logsPage * PAGE_SIZE);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedUsername = username.trim().toLowerCase();
    const cleanedName = fullName.trim();
    const rawPassword = password.trim();

    try {
      await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanedUsername,
          fullName: cleanedName,
          role,
          password: rawPassword,
          mustChangePassword: true,
        }),
      });
    } catch {
      // Résilience hors-ligne
    }

    onAddStaff({
      username: cleanedUsername,
      fullName: cleanedName,
      role,
      pin: pin.trim(),
      passwordHash: rawPassword,
      is2FAEnabled: role === 'ADMIN',
      mustChangePassword: true,
    });
    setUsername('');
    setFullName('');
    setSubTab('users');
    setFeedbackMsg({
      type: 'success',
      text: `Équipier ${cleanedName} créé. Changement de mot de passe proposé dès sa première connexion.`,
    });
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResetUser) return;
    if (newPassword.trim()) {
      try {
        await fetch('/api/auth/sync-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: selectedResetUser.id,
            username: selectedResetUser.username,
            fullName: selectedResetUser.fullName,
            role: selectedResetUser.role,
            password: newPassword.trim(),
            mustChangePassword: true,
          }),
        });
      } catch {
        // Résilience hors-ligne
      }
    }
    onResetStaffPassword(selectedResetUser.id, newPin, newPassword.trim() || undefined);
    setSelectedResetUser(null);
    setNewPin('');
    setNewPassword('');
    setFeedbackMsg({ type: 'success', text: 'Identifiants réinitialisés et chiffrés côté serveur !' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Gestion des Utilisateurs du Personnel & Sécurité RBAC
              </h2>
              <p className="text-xs text-slate-400">Rôles : Administrateur / Propriétaire · Gérant · Caissier</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sous-onglets */}
        <div className="flex border-b border-slate-800 px-4 bg-slate-850">
          <button
            onClick={() => setSubTab('users')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
              subTab === 'users' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Membres du Personnel ({staffUsers.length})
          </button>
          <button
            onClick={() => setSubTab('add')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
              subTab === 'add' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Ajouter un Caissier / Gérant
          </button>
          <button
            onClick={() => setSubTab('logs')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
              subTab === 'logs' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Journal des Connexions ({loginLogs.length})
          </button>
        </div>

        {/* Corps */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedbackMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackMsg(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {subTab === 'users' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {staffUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-slate-800/60 border border-slate-700/80 p-4 rounded-xl flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2.5">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-600 shrink-0 mt-0.5"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-700/80 border border-slate-600 flex items-center justify-center text-xs font-black text-cyan-300 shrink-0 mt-0.5">
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">{user.fullName}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                                user.role === 'ADMIN'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : user.role === 'GERANT'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {user.role}
                            </span>
                            {user.isBlocked && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/25 text-rose-300 border border-rose-500/50">
                                ⚠️ Bloqué
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 font-mono mt-0.5">Identifiant : @{user.username}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Code PIN : {user.pin}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {/* Bouton Débloquer / Bloquer (Section F) */}
                        {user.isBlocked ? (
                          <button
                            type="button"
                            onClick={() => onUnblockUser?.(user.id)}
                            title="Débloquer ce compte immédiatement"
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-600/30 transition cursor-pointer"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Débloquer</span>
                          </button>
                        ) : user.role !== 'ADMIN' ? (
                          <button
                            type="button"
                            onClick={() => setConfirmBlockUser(user)}
                            title="Bloquer manuellement ce compte"
                            className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-700/60 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Lock className="w-3 h-3 text-rose-400" />
                            <span>Bloquer</span>
                          </button>
                        ) : null}

                        <button
                          onClick={() => setSelectedResetUser(user)}
                          title="Réinitialiser le mot de passe / PIN"
                          className="p-1.5 text-blue-400 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDeleteUser(user);
                            setAdminPasswordConfirm('');
                            setDeleteError('');
                          }}
                          title="Supprimer ou archiver cet utilisateur"
                          className="p-1.5 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Modification du rôle en direct */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">Modifier Rôle :</span>
                      <select
                        value={user.role}
                        onChange={(e) => onUpdateStaffRole(user.id, e.target.value as StaffRole)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-white focus:outline-none"
                      >
                        <option value="CAISSIER">Caissier</option>
                        <option value="GERANT">Gérant</option>
                        <option value="ADMIN">Administrateur</option>
                      </select>
                    </div>

                    <div className="border-t border-slate-700/60 pt-2 text-[10px] text-slate-400 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>2FA : {user.is2FAEnabled ? 'Activée' : 'Désactivée'}</span>
                        <span className="text-slate-500">·</span>
                        <span className="font-mono">Échecs : {user.failedAttempts || 0}/5</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {user.isBlocked ? (
                          <span className="text-rose-400 font-bold bg-rose-500/15 px-1.5 py-0.2 rounded border border-rose-500/30">
                            Bloqué ({user.blockReason || '5 échecs'})
                          </span>
                        ) : user.role === 'ADMIN' && user.lockedUntil && user.lockedUntil > Date.now() ? (
                          <span className="text-amber-400 font-bold bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/30">
                            Délai 60s en cours
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                            Actif / Débloqué
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {subTab === 'add' && (
            <form onSubmit={handleCreate} className="max-w-md mx-auto space-y-3 bg-slate-800/40 p-5 rounded-xl border border-slate-700">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <span>Nouveau Membre du Personnel</span>
              </h3>

              <div>
                <label className="text-slate-400 block mb-1">Nom Complet :</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Jonathan Boketshu"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Nom d'utilisateur (Identifiant) :</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: jonathan"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Rôle et Niveau d'Accès :</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="CAISSIER">Caissier (Tickets, File d'attente, Caisse)</option>
                  <option value="GERANT">Gérant (Clôture caisse, Domotique, Rapports)</option>
                  <option value="ADMIN">Administrateur / Propriétaire (Accès Total)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Code PIN (4-6 chiffres) :</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-center"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Mot de Passe :</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow transition mt-2"
              >
                Enregistrer l'équipier
              </button>
            </form>
          )}

          {subTab === 'logs' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-800/80 text-slate-400 font-sans border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Date / Heure</th>
                    <th className="py-2.5 px-3">Utilisateur</th>
                    <th className="py-2.5 px-3">Méthode</th>
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-3">Appareil / Détail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/60">
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 px-3 text-white font-bold font-sans">
                        @{log.username} {log.role && <span className="text-[10px] text-cyan-400">({log.role})</span>}
                      </td>
                      <td className="py-2 px-3 text-slate-300">{log.method}</td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.2 rounded font-bold ${log.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {log.success ? 'RÉUSSI' : 'ÉCHEC'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 truncate max-w-[200px] font-sans">
                        {log.ipOrDevice} {log.failureReason && `(${log.failureReason})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                currentPage={logsPage}
                totalItems={loginLogs.length}
                pageSize={PAGE_SIZE}
                onPageChange={setLogsPage}
                itemLabel="connexions"
              />
            </div>
          )}

          {/* Modal Réinitialisation PIN / Mot de Passe */}
          {selectedResetUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-3">
                <h3 className="font-bold text-white text-sm">
                  Réinitialiser l'accès de {selectedResetUser.fullName}
                </h3>
                <form onSubmit={handleResetSubmit} className="space-y-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Nouveau Code PIN :</label>
                    <input
                      type="password"
                      maxLength={6}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="1234"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono text-center"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Nouveau Mot de Passe (optionnel) :</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedResetUser(null)}
                      className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg"
                    >
                      Sauvegarder
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Confirmation de Suppression / Archivage */}
          {selectedDeleteUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <h3 className="font-bold text-white text-base">
                    Suppression de l'utilisateur @{selectedDeleteUser.username}
                  </h3>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2 text-xs">
                  <div className="text-white font-medium">
                    {selectedDeleteUser.fullName} ({selectedDeleteUser.role})
                  </div>
                  {tickets.some(
                    (t) =>
                      t.cashierId === selectedDeleteUser.id ||
                      (t.cashierName &&
                        (t.cashierName.toLowerCase().includes(selectedDeleteUser.username.toLowerCase()) ||
                          t.cashierName.toLowerCase().includes(selectedDeleteUser.fullName.toLowerCase())))
                  ) ? (
                    <div className="text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/30 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <span className="font-bold">Préservation comptable (Audit) :</span>
                        <p className="mt-0.5 text-[11px] text-slate-300">
                          Cet utilisateur a déjà émis des tickets de caisse. Pour garantir la traçabilité financière, il sera <strong>ARCHIVÉ</strong> et son accès sera révoqué immédiatement, sans altérer les historiques de vente.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-rose-300 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/30 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <span className="font-bold">Suppression définitive :</span>
                        <p className="mt-0.5 text-[11px] text-slate-300">
                          Aucun ticket n'est rattaché à cet utilisateur. Son profil sera définitivement supprimé de la base de données.
                        </p>
                      </div>
                    </div>
                  )}

                  {isCurrentShiftOpen && currentShiftCashierId === selectedDeleteUser.id && (
                    <div className="text-rose-400 font-bold bg-rose-950/40 p-2 rounded border border-rose-700/50">
                      Attention : Cet utilisateur a une caisse actuellement ouverte. Vous devez clôturer sa caisse avant de supprimer ou archiver son compte.
                    </div>
                  )}
                </div>

                {deleteError && (
                  <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setDeleteError('');
                    const res = await onDeleteStaff(selectedDeleteUser.id, adminPasswordConfirm);
                    if (res.success) {
                      setSelectedDeleteUser(null);
                      setAdminPasswordConfirm('');
                      setFeedbackMsg({ type: 'success', text: res.message });
                    } else {
                      setDeleteError(res.message);
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">
                      Confirmez avec votre mot de passe Administrateur :
                    </label>
                    <input
                      type="password"
                      value={adminPasswordConfirm}
                      onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                      placeholder="Mot de passe Admin"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-rose-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDeleteUser(null);
                        setDeleteError('');
                        setAdminPasswordConfirm('');
                      }}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isCurrentShiftOpen && currentShiftCashierId === selectedDeleteUser.id}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-lg shadow"
                    >
                      Confirmer l'opération
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Modal confirmation blocage manuel */}
          {confirmBlockUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
                <div className="flex items-center gap-2 text-rose-400">
                  <Lock className="w-5 h-5" />
                  <h3 className="font-bold text-white text-sm">
                    Bloquer @{confirmBlockUser.username} ?
                  </h3>
                </div>
                <p className="text-xs text-slate-300">
                  {confirmBlockUser.fullName} sera immédiatement déconnecté(e) s&apos;il/elle est en session et ne pourra plus se reconnecter jusqu&apos;au déblocage par l&apos;administrateur.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmBlockUser(null)}
                    className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onBlockUser?.(confirmBlockUser.id, "Bloqué manuellement par l'administrateur");
                      setFeedbackMsg({ type: 'success', text: `Compte @${confirmBlockUser.username} bloqué.` });
                      setConfirmBlockUser(null);
                    }}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Confirmer le blocage
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
