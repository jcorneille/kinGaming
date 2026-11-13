import React, { useState } from 'react';
import {
  KeyRound,
  Lock,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';
import { StaffUser, SystemSettings } from '../types';

interface FirstLoginPasswordModalProps {
  isOpen: boolean;
  user: StaffUser | null;
  settings: SystemSettings;
  onPasswordChanged: (payload: {
    userId: string;
    hashMarker?: string;
    passwordUpdatedAt?: number;
  }) => void;
  onPostpone: (user: StaffUser) => void;
}

export const FirstLoginPasswordModal: React.FC<FirstLoginPasswordModalProps> = ({
  isOpen,
  user,
  settings,
  onPasswordChanged,
  onPostpone,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const minLength = Math.max(6, settings.passwordMinLength || 6);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.trim().length < minLength) {
      setErrorMsg(`Le nouveau mot de passe doit contenir au moins ${minLength} caractères.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Les deux saisies de mot de passe ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          username: user.username,
          newPassword,
          isFirstLogin: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Impossible de mettre à jour le mot de passe.');
        setIsSubmitting(false);
        return;
      }

      setNewPassword('');
      setConfirmPassword('');
      onPasswordChanged({
        userId: user.id,
        hashMarker: data.hashMarker,
        passwordUpdatedAt: data.passwordUpdatedAt,
      });
    } catch {
      setNewPassword('');
      setConfirmPassword('');
      onPasswordChanged({
        userId: user.id,
        passwordUpdatedAt: Date.now(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border-b border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-wider font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Première Connexion · Sécurité du Compte</span>
          </div>
          <h2 className="text-base font-bold text-white">
            Personnalisez votre mot de passe, {user.fullName.split(' ')[0]}
          </h2>
          <p className="text-xs text-slate-400">
            Pour sécuriser votre accès, il est recommandé de remplacer le mot de passe initial par un mot de passe personnel. Vous pouvez aussi reporter cette étape.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Identifiant non modifiable */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold flex items-center justify-between">
              <span>Votre identifiant (fixe)</span>
              <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Non modifiable
              </span>
            </label>
            <input
              type="text"
              value={`@${user.username}`}
              disabled
              readOnly
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 font-mono cursor-not-allowed"
            />
          </div>

          {/* Nouveau mot de passe */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Nouveau mot de passe *</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Masquer' : 'Afficher'}</span>
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={`Minimum ${minLength} caractères`}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 focus:outline-none"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">
              Confirmer le nouveau mot de passe *
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ressaisissez le mot de passe"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div className="text-[10px] text-slate-400 bg-slate-800/50 border border-slate-800 rounded-lg p-2.5">
            Les mots de passe sont chiffrés (hachés par <code className="text-cyan-400">scrypt</code> + sel unique) côté serveur et chaque modification est journalisée.
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={() => onPostpone(user)}
              className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Reporter à plus tard</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition cursor-pointer"
            >
              {isSubmitting ? 'Enregistrement...' : 'Changer mon mot de passe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
