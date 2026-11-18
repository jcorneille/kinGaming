import React, { useState, useEffect } from 'react';
import {
  Lock,
  UserCheck,
  ShieldAlert,
  KeyRound,
  Delete,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { StaffUser, LoginLog, StaffRole } from '../types';
import { X, Smartphone } from 'lucide-react';

interface StaffLoginModalProps {
  isOpen: boolean;
  staffUsers: StaffUser[];
  onLoginSuccess: (user: StaffUser, method: 'PIN' | 'PASSWORD' | '2FA') => void;
  onRecordLoginAttempt: (username: string, success: boolean, method: 'PIN' | 'PASSWORD' | '2FA', reason?: string) => void;
  admin2FAEnforced: boolean;
  onClose?: () => void;
  onSwitchToCustomerPortal?: () => void;
}

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({
  isOpen,
  staffUsers,
  onLoginSuccess,
  onRecordLoginAttempt,
  admin2FAEnforced,
  onClose,
  onSwitchToCustomerPortal,
}) => {
  const [authMode, setAuthMode] = useState<'PIN' | 'PASSWORD'>('PIN');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffUsers[2]?.id || staffUsers[0]?.id);
  const [pinInput, setPinInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Étape 2FA pour Admin
  const [requires2FA, setRequires2FA] = useState<boolean>(false);
  const [twoFactorCode, setTwoFactorCode] = useState<string>('');
  const [pendingUser, setPendingUser] = useState<StaffUser | null>(null);

  // Verrouillage anti force-brute
  const [failedCount, setFailedCount] = useState<number>(0);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  useEffect(() => {
    if (lockoutSeconds > 0) {
      const timer = setInterval(() => {
        setLockoutSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setFailedCount(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutSeconds]);

  if (!isOpen) return null;

  const currentSelectedUser = staffUsers.find(u => u.id === selectedStaffId);

  // Pavé numérique PIN
  const handleDigitPress = (digit: string) => {
    if (lockoutSeconds > 0) return;
    if (pinInput.length < 6) {
      setPinInput(prev => prev + digit);
      setErrorMsg('');
    }
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClearPin = () => {
    setPinInput('');
    setErrorMsg('');
  };

  // Validation du PIN
  const handleVerifyPin = () => {
    if (!currentSelectedUser || lockoutSeconds > 0) return;

    if (currentSelectedUser.pin === pinInput) {
      // Si Admin avec 2FA activée
      if (currentSelectedUser.role === 'ADMIN' && (currentSelectedUser.is2FAEnabled || admin2FAEnforced)) {
        setPendingUser(currentSelectedUser);
        setRequires2FA(true);
        setPinInput('');
        return;
      }

      onRecordLoginAttempt(currentSelectedUser.username, true, 'PIN');
      onLoginSuccess(currentSelectedUser, 'PIN');
      setPinInput('');
      setFailedCount(0);
    } else {
      const nextFail = failedCount + 1;
      setFailedCount(nextFail);
      onRecordLoginAttempt(currentSelectedUser.username, false, 'PIN', 'Code PIN erroné');

      if (nextFail >= 5) {
        setLockoutSeconds(60);
        setErrorMsg('Compte temporairement verrouillé pour 60 secondes suite à 5 tentatives infructueuses.');
      } else {
        setErrorMsg(`Code PIN incorrect (${nextFail}/5 tentatives).`);
      }
      setPinInput('');
    }
  };

  // Validation Identifiant + Mot de passe
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    const user = staffUsers.find(u => u.username.toLowerCase() === usernameInput.trim().toLowerCase());
    let isValid = false;
    if (user) {
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user.username, password: passwordInput }),
        });
        if (res.ok) {
          const data = await res.json();
          isValid = data.hasRecord ? Boolean(data.valid) : user.passwordHash === passwordInput;
        } else {
          isValid = user.passwordHash === passwordInput;
        }
      } catch {
        isValid = user.passwordHash === passwordInput;
      }
    }

    if (user && isValid) {
      if (user.role === 'ADMIN' && (user.is2FAEnabled || admin2FAEnforced)) {
        setPendingUser(user);
        setRequires2FA(true);
        setPasswordInput('');
        return;
      }

      onRecordLoginAttempt(user.username, true, 'PASSWORD');
      onLoginSuccess(user, 'PASSWORD');
      setUsernameInput('');
      setPasswordInput('');
      setFailedCount(0);
    } else {
      const nextFail = failedCount + 1;
      setFailedCount(nextFail);
      onRecordLoginAttempt(usernameInput || 'Inconnu', false, 'PASSWORD', 'Mot de passe erroné');

      if (nextFail >= 5) {
        setLockoutSeconds(60);
        setErrorMsg('Accès bloqué pendant 60 secondes après 5 tentatives échouées.');
      } else {
        setErrorMsg(`Identifiants invalides (${nextFail}/5 tentatives).`);
      }
    }
  };

  // Validation 2FA (Code OTP)
  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;

    // Code de démonstration : 123456 ou code secret enregistré
    if (twoFactorCode === '123456' || twoFactorCode === pendingUser.twoFactorSecret) {
      onRecordLoginAttempt(pendingUser.username, true, '2FA');
      onLoginSuccess(pendingUser, '2FA');
      setRequires2FA(false);
      setPendingUser(null);
      setTwoFactorCode('');
    } else {
      setErrorMsg('Code de double authentification (OTP) invalide.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* En-tête */}
        <div className="relative p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 text-center space-y-1">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">GOZA — Accès Personnel</h2>
          <p className="text-xs text-slate-400">Authentification sécurisée du personnel d'accueil</p>
        </div>

        {/* Message d'erreur ou de verrouillage */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {lockoutSeconds > 0 && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs text-center font-mono font-bold animate-pulse">
            Terminal bloqué. Réessayez dans {lockoutSeconds}s...
          </div>
        )}

        {/* Étape 2FA pour Admin */}
        {requires2FA ? (
          <form onSubmit={handleVerify2FA} className="p-6 space-y-4">
            <div className="text-center space-y-1">
              <KeyRound className="w-8 h-8 text-cyan-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Double Authentification Requise (2FA)</h3>
              <p className="text-xs text-slate-400">
                Saisissez le code OTP à 6 chiffres envoyé sur votre appareil de direction.
              </p>
              <div className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 py-1 px-2 rounded-lg border border-cyan-800/40 inline-block">
                Code démo autorisé : 123456
              </div>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-widest font-mono text-2xl font-bold bg-slate-800 border border-slate-700 rounded-xl py-3 text-white focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setPendingUser(null);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
              >
                Retour
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg"
              >
                Confirmer l'accès
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-4">
            {/* Bascule mode d'authentification */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAuthMode('PIN')}
                className={`py-1.5 rounded-lg transition ${
                  authMode === 'PIN' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Code PIN Tactile (Rapide)
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('PASSWORD')}
                className={`py-1.5 rounded-lg transition ${
                  authMode === 'PASSWORD' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Identifiant / MDP
              </button>
            </div>

            {authMode === 'PIN' ? (
              <div className="space-y-4">
                {/* Choix rapide de l'équipier pour prise de poste */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                    Sélectionner votre profil de caisse :
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {staffUsers.map((user) => {
                      const isSelected = selectedStaffId === user.id;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedStaffId(user.id);
                            setPinInput('');
                            setErrorMsg('');
                          }}
                          className={`p-2 rounded-xl text-left border transition ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                              : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="font-bold text-xs truncate">{user.fullName.split(' ')[0]}</div>
                          <div className="text-[10px] font-mono text-cyan-400 flex items-center justify-between">
                            <span>{user.role}</span>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Masque de saisie du PIN */}
                <div className="text-center py-2">
                  <div className="flex items-center justify-center gap-3">
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <div
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                          idx < pinInput.length
                            ? 'bg-blue-400 scale-110 shadow-sm shadow-blue-400/50'
                            : 'bg-slate-800 border border-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-2">
                    PIN par défaut : Erick <code className="text-amber-400">1234</code> · Admin <code className="text-amber-400">9999</code> · Gérant <code className="text-amber-400">5555</code>
                  </div>
                </div>

                {/* Pavé numérique tactile 3x4 */}
                <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      disabled={lockoutSeconds > 0}
                      onClick={() => handleDigitPress(digit)}
                      className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-blue-600 text-white font-mono text-lg font-bold border border-slate-700 flex items-center justify-center transition shadow-sm"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleClearPin}
                    className="h-12 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 text-xs font-semibold flex items-center justify-center transition"
                  >
                    Effacer
                  </button>
                  <button
                    type="button"
                    disabled={lockoutSeconds > 0}
                    onClick={() => handleDigitPress('0')}
                    className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-blue-600 text-white font-mono text-lg font-bold border border-slate-700 flex items-center justify-center transition shadow-sm"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="h-12 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 flex items-center justify-center transition"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>

                {/* Bouton de confirmation */}
                <button
                  type="button"
                  disabled={pinInput.length < 4 || lockoutSeconds > 0}
                  onClick={handleVerifyPin}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Ouvrir la session & Prise de poste</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyPassword} className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Identifiant :</label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="ex: admin, gerant ou erick"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Mot de passe :</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Admin: <code className="text-slate-400">admin2026!</code> · Caissier: <code className="text-slate-400">caisse1234</code>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={lockoutSeconds > 0}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
                >
                  Se connecter
                </button>
              </form>
            )}
          </div>
        )}
        {onSwitchToCustomerPortal && (
          <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onSwitchToCustomerPortal}
              className="text-xs text-purple-300 hover:text-white flex items-center justify-center gap-1.5 mx-auto py-1 font-semibold transition"
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              <span>Vous êtes un joueur ? Accéder directement à l'Espace Client</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
