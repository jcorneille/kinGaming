import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UserCheck,
  Lock,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Camera,
  Trash2,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import { StaffUser, SystemSettings } from '../types';
import { compressProfileImage, compressBackgroundImage } from '../utils/imageResize';
import { DEFAULT_PAGE_BACKGROUND_URL, DEFAULT_PAGE_BACKGROUND_OPACITY } from '../services/storage';

interface MyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStaffUser: StaffUser | null;
  settings: SystemSettings;
  onProfileUpdated: (payload: {
    userId: string;
    fullName: string;
    avatarUrl?: string;
    passwordChanged: boolean;
    hashMarker?: string;
    passwordUpdatedAt?: number;
  }) => void;
  onUpdatePageBackground?: (backgroundUrl: string, opacity: number) => void;
}

export const MyProfileModal: React.FC<MyProfileModalProps> = ({
  isOpen,
  onClose,
  currentStaffUser,
  settings,
  onProfileUpdated,
  onUpdatePageBackground,
}) => {
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && currentStaffUser) {
      setFullName(currentStaffUser.fullName);
      setAvatarUrl(currentStaffUser.avatarUrl || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, currentStaffUser]);

  if (!isOpen || !currentStaffUser) return null;

  const isAdmin = currentStaffUser.role === 'ADMIN';
  const minLength = Math.max(6, settings.passwordMinLength || 6);
  const currentBgUrl = settings.pageBackgroundUrl ?? DEFAULT_PAGE_BACKGROUND_URL;
  const currentBgOpacity = settings.pageBackgroundOpacity ?? DEFAULT_PAGE_BACKGROUND_OPACITY;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setIsUploadingPhoto(true);
    try {
      const compressed = await compressProfileImage(file, 256, 0.82);
      setAvatarUrl(compressed);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur lors du traitement de la photo.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBackgroundSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdatePageBackground) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsUploadingBg(true);
    try {
      const compressed = await compressBackgroundImage(file, 1600, 900, 0.8);
      onUpdatePageBackground(compressed, currentBgOpacity);
      setSuccessMsg("Image d'arrière-plan de toute la plateforme mise à jour immédiatement !");
    } catch (err: any) {
      setErrorMsg(err?.message || "Erreur lors du traitement de l'image de fond.");
    } finally {
      setIsUploadingBg(false);
      if (bgFileInputRef.current) bgFileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword.trim()) {
      setErrorMsg('Veuillez saisir votre mot de passe actuel pour confirmer la modification.');
      return;
    }

    const cleanedName = fullName.trim();
    if (isAdmin && cleanedName.length < 2) {
      setErrorMsg('Le nom affiché doit contenir au moins 2 caractères.');
      return;
    }

    const wantsPasswordChange = newPassword.trim().length > 0 || confirmPassword.trim().length > 0;
    if (wantsPasswordChange) {
      if (newPassword.trim().length < minLength) {
        setErrorMsg(`Le nouveau mot de passe doit contenir au moins ${minLength} caractères.`);
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('La confirmation du nouveau mot de passe ne correspond pas.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentStaffUser.id,
          username: currentStaffUser.username,
          currentPassword,
          fullName: isAdmin ? cleanedName : currentStaffUser.fullName,
          avatarUrl,
          newPassword: wantsPasswordChange ? newPassword : '',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Mot de passe actuel incorrect ou erreur serveur.');
        setIsSubmitting(false);
        return;
      }

      onProfileUpdated({
        userId: currentStaffUser.id,
        fullName: data.fullName || (isAdmin ? cleanedName : currentStaffUser.fullName),
        avatarUrl: typeof data.avatarUrl === 'string' ? (data.avatarUrl || undefined) : (avatarUrl || undefined),
        passwordChanged: Boolean(data.passwordChanged),
        hashMarker: data.hashMarker,
        passwordUpdatedAt: data.passwordUpdatedAt,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg(
        data.passwordChanged
          ? 'Profil, photo et mot de passe mis à jour avec succès (mot de passe haché côté serveur).'
          : 'Informations et photo de profil mises à jour avec succès.'
      );
    } catch {
      // Fallback hors-ligne si serveur injoignable
      if (
        currentStaffUser.passwordHash &&
        !currentStaffUser.passwordHash.startsWith('scrypt$') &&
        currentPassword !== currentStaffUser.passwordHash
      ) {
        setErrorMsg('Mot de passe actuel incorrect.');
        setIsSubmitting(false);
        return;
      }

      onProfileUpdated({
        userId: currentStaffUser.id,
        fullName: isAdmin ? cleanedName : currentStaffUser.fullName,
        avatarUrl: avatarUrl || undefined,
        passwordChanged: wantsPasswordChange,
        passwordUpdatedAt: wantsPasswordChange ? Date.now() : currentStaffUser.passwordUpdatedAt,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg('Profil mis à jour (mode local).');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* En-tête */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Mon Profil & Sécurité de Session</h2>
              <p className="text-[11px] text-slate-400">
                Rôle : <span className="text-cyan-400 font-mono font-bold">{currentStaffUser.role}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Photo de profil */}
          <div className="p-3.5 bg-slate-800/50 border border-slate-700/80 rounded-xl flex items-center gap-4">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={currentStaffUser.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-500/60 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-xl border-2 border-slate-700">
                  {currentStaffUser.fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div>
                <div className="font-bold text-white">Photo de profil</div>
                <p className="text-[10px] text-slate-400">
                  PNG, JPG ou WebP · Recadrée et compressée automatiquement.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-blue-600/25 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isUploadingPhoto ? 'Traitement...' : avatarUrl ? 'Changer la photo' : 'Télécharger une photo'}</span>
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="px-2.5 py-1.5 bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-700/50 rounded-lg font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Retirer</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Arrière-plan global de toute l'application (Réservé Administrateur) */}
          {isAdmin && onUpdatePageBackground && (
            <div className="p-3.5 bg-gradient-to-br from-amber-950/25 via-slate-800/50 to-slate-900 border border-amber-500/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>Arrière-plan de toute la page (Admin)</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                  Opacité {Math.round(currentBgOpacity * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-[#090D16] border border-slate-700 shrink-0 flex items-center justify-center">
                  {currentBgUrl ? (
                    <img
                      src={currentBgUrl}
                      alt="Aperçu fond"
                      style={{ opacity: Math.max(0.2, currentBgOpacity) }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-500">Aucun</span>
                  )}
                </div>
                <div className="flex-1 flex flex-wrap gap-1.5">
                  <input
                    ref={bgFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingBg}
                    onClick={() => bgFileInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{isUploadingBg ? 'Compression...' : 'Changer l’image'}</span>
                  </button>
                  {currentBgUrl !== DEFAULT_PAGE_BACKGROUND_URL && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePageBackground(DEFAULT_PAGE_BACKGROUND_URL, DEFAULT_PAGE_BACKGROUND_OPACITY);
                        setSuccessMsg("Image d'arrière-plan par défaut rétablie !");
                      }}
                      className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Rétablir l'image Kin Gaming Hub par défaut"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-400" />
                      <span>Défaut</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Opacité faible en arrière-plan</span>
                  <span className="font-mono text-slate-200">{Math.round(currentBgOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={45}
                  step={1}
                  value={Math.round(currentBgOpacity * 100)}
                  onChange={(e) => onUpdatePageBackground(currentBgUrl, Number(e.target.value) / 100)}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Identifiant permanent (non modifiable) */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold flex items-center justify-between">
              <span>Identifiant de connexion</span>
              <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Non modifiable
              </span>
            </label>
            <input
              type="text"
              value={`@${currentStaffUser.username}`}
              disabled
              readOnly
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 font-mono cursor-not-allowed select-none"
            />
            <p className="text-[10px] text-slate-500">
              Par sécurité d&apos;audit, l&apos;identifiant permanent ne peut jamais être modifié.
            </p>
          </div>

          {/* Nom affiché (modifiable par l'administrateur) */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">
              Nom affiché sur la session et les tickets
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!isAdmin}
              placeholder="Ex: Aimé (Propriétaire / Admin)"
              className={`w-full border rounded-xl px-3 py-2 text-white focus:outline-none ${
                isAdmin
                  ? 'bg-slate-800 border-slate-700 focus:border-blue-500'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 cursor-not-allowed'
              }`}
              required
            />
            {!isAdmin && (
              <p className="text-[10px] text-slate-500">
                Seul l&apos;administrateur peut modifier les noms d&apos;affichage du personnel.
              </p>
            )}
          </div>

          {/* Séparateur Changement Mot de passe */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Changer mon mot de passe (optionnel)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPasswords ? 'Masquer' : 'Afficher'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Nouveau mot de passe</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={`Min. ${minLength} caractères`}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Confirmer le nouveau</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ressaisir"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Confirmation obligatoire par mot de passe actuel */}
          <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl space-y-1.5">
            <label className="text-blue-300 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Mot de passe actuel obligatoire pour valider *</span>
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Saisissez votre mot de passe actuel"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              required
            />
            <p className="text-[10px] text-slate-400">
              Vérifié et haché (scrypt + sel aléatoire) côté serveur. Toute modification est journalisée.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition cursor-pointer"
            >
              {isSubmitting ? 'Vérification...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
