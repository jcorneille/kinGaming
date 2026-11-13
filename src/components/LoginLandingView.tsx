import React, { useState, useEffect } from 'react';
import {
  Lock,
  Smartphone,
  KeyRound,
  Shield,
  Award,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Tv,
  UserCheck,
  RotateCcw,
  Clock,
  HelpCircle,
  Hash
} from 'lucide-react';
import { StaffUser, Client, StaffRole } from '../types';

interface LoginLandingViewProps {
  staffUsers: StaffUser[];
  clients: Client[];
  onStaffLogin: (user: StaffUser, method: 'PIN' | 'PASSWORD' | '2FA') => void;
  onClientLogin: (client: Client) => void;
  onRecordLoginAttempt?: (username: string, success: boolean, method: 'PIN' | 'PASSWORD' | '2FA', reason?: string) => void;
  onBlockUserAccount?: (userId: string, reason: string) => void;
  onUpdateUserAttempts?: (userId: string, count: number, lockedUntil?: number) => void;
  admin2FAEnforced?: boolean;
  backgroundImageUrl?: string;
  onExploreCockpit?: () => void;
}

export const LoginLandingView: React.FC<LoginLandingViewProps> = ({
  staffUsers,
  clients,
  onStaffLogin,
  onClientLogin,
  onRecordLoginAttempt,
  onBlockUserAccount,
  onUpdateUserAttempts,
  admin2FAEnforced = false,
  backgroundImageUrl,
  onExploreCockpit,
}) => {
  const [activeTab, setActiveTab] = useState<'CLIENT' | 'STAFF'>('STAFF');

  // ================= ÉTATS DU PERSONNEL =================
  const [staffAuthMode, setStaffAuthMode] = useState<'PIN' | 'PASSWORD'>('PIN');
  const [staffUsername, setStaffUsername] = useState<string>('erick');
  const [staffPassword, setStaffPassword] = useState<string>('');
  const [staffPin, setStaffPin] = useState<string>('');
  const [selectedStaffUser, setSelectedStaffUser] = useState<StaffUser>(staffUsers[2] || staffUsers[0]);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null);

  // Étape 2FA pour Administrateur
  const [is2FAStep, setIs2FAStep] = useState<boolean>(false);
  const [twoFactorCode, setTwoFactorCode] = useState<string>('');
  const [pendingStaffUser, setPendingStaffUser] = useState<StaffUser | null>(null);

  // ================= ÉTATS DE L'ESPACE CLIENT =================
  const [clientPhone, setClientPhone] = useState<string>('+243 89 545 7097');
  const [clientPin, setClientPin] = useState<string>('1234');
  const [clientError, setClientError] = useState<string | null>(null);
  const [authenticatedClient, setAuthenticatedClient] = useState<Client | null>(null);

  // Accordéon des comptes de test / démo pour test immédiat
  const [showDemoCredentials, setShowDemoCredentials] = useState<boolean>(false);

  // Synchroniser la sélection de profil
  const handleSelectStaffUser = (userId: string) => {
    const user = staffUsers.find((u) => u.id === userId);
    if (user) {
      setSelectedStaffUser(user);
      setStaffUsername(user.username);
      setStaffPin('');
      setStaffPassword('');
      setStaffError(null);
    }
  };

  // ================= VALIDATION RÉELLE DE LA CONNEXION PERSONNEL =================
  const handleStaffLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    setStaffSuccess(null);

    // 1. Trouver l'utilisateur
    let user: StaffUser | undefined;
    if (staffAuthMode === 'PIN') {
      user = staffUsers.find((u) => u.id === selectedStaffUser.id) || selectedStaffUser;
    } else {
      user = staffUsers.find(
        (u) => u.username.toLowerCase() === staffUsername.trim().toLowerCase()
      );
    }

    if (!user) {
      setStaffPin('');
      setStaffPassword('');
      setStaffError("Identifiant incorrect. Aucun compte personnel trouvé.");
      onRecordLoginAttempt?.(staffUsername || 'Inconnu', false, staffAuthMode, 'Utilisateur inexistant');
      return;
    }

    // 2. Vérifier si le compte est bloqué (Section F : bloqué après 5 échecs ou manuellement)
    if (user.isBlocked) {
      setStaffPin('');
      setStaffPassword('');
      setStaffError(
        `Le compte @${user.username} (${user.fullName}) est bloqué : ${user.blockReason || 'Bloqué après 5 échecs de connexion'}. Seul l'administrateur peut le débloquer depuis l'écran Utilisateurs.`
      );
      onRecordLoginAttempt?.(user.username, false, staffAuthMode, 'Tentative de connexion sur compte bloqué');
      return;
    }

    // 3. Vérifier le délai d'attente temporaire d'une minute pour Administrateur (Section F)
    if (user.role === 'ADMIN' && user.lockedUntil && user.lockedUntil > Date.now()) {
      const remainingSec = Math.ceil((user.lockedUntil - Date.now()) / 1000);
      setStaffPin('');
      setStaffPassword('');
      setStaffError(
        `Délai d'attente de sécurité Administrateur en cours : veuillez patienter encore ${remainingSec} secondes avant de réessayer.`
      );
      return;
    }

    // 4. Vérifier si le compte est actif / non archivé
    if (!user.isActive || user.isArchived) {
      setStaffPin('');
      setStaffPassword('');
      setStaffError("Ce compte a été suspendu par l'administrateur. Accès refusé.");
      onRecordLoginAttempt?.(user.username, false, staffAuthMode, 'Compte désactivé/archivé');
      return;
    }

    // 5. Vérifier le mot de passe (côté serveur scrypt) ou le code PIN
    let isValid = false;
    if (staffAuthMode === 'PIN') {
      isValid = user.pin === staffPin.trim();
    } else {
      try {
        const verifyRes = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user.username, password: staffPassword }),
        });
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          if (verifyData.hasRecord) {
            isValid = Boolean(verifyData.valid);
            if (isValid && verifyData.avatarUrl && !user.avatarUrl) {
              user = { ...user, avatarUrl: verifyData.avatarUrl };
            }
          } else {
            isValid = user.passwordHash === staffPassword;
          }
        } else {
          isValid = user.passwordHash === staffPassword;
        }
      } catch {
        // Fallback hors-ligne si serveur injoignable
        isValid = user.passwordHash === staffPassword;
      }
    }

    if (!isValid) {
      const currentFailures = (user.failedAttempts || 0) + 1;
      setStaffPin('');
      setStaffPassword('');

      // Traitement différencié : les comptes admin ne sont JAMAIS bloqués définitivement (délai 1 min)
      if (user.role === 'ADMIN') {
        if (currentFailures >= 5) {
          const lockUntil = Date.now() + 60000; // 60 secondes
          onUpdateUserAttempts?.(user.id, 5, lockUntil);
          onRecordLoginAttempt?.(
            user.username,
            false,
            staffAuthMode,
            "5 échecs consécutifs sur compte Admin (délai d'attente de 60s activé)"
          );
          setStaffError(
            "5 tentatives échouées sur le compte Administrateur. Délai de sécurité d'une minute activé (l'écran reste accessible aux autres utilisateurs)."
          );
        } else {
          onUpdateUserAttempts?.(user.id, currentFailures);
          onRecordLoginAttempt?.(user.username, false, staffAuthMode, "Code PIN ou mot de passe erroné");
          setStaffError(
            `Code PIN ou mot de passe incorrect (${currentFailures}/5 tentatives avant délai de sécurité de 1 min).`
          );
        }
      } else {
        // Pour Caissiers et Gérants : après 5 échecs, le compte spécifique est bloqué (seul l'administrateur peut débloquer)
        if (currentFailures >= 5) {
          onBlockUserAccount?.(user.id, "Bloqué automatiquement après 5 échecs de connexion consécutifs");
          onRecordLoginAttempt?.(
            user.username,
            false,
            staffAuthMode,
            "Compte bloqué après 5 échecs consécutifs"
          );
          setStaffError(
            `Ce compte (@${user.username}) est désormais bloqué suite à 5 tentatives infructueuses. Seul l'administrateur peut le débloquer depuis l'écran Utilisateurs. Les autres utilisateurs peuvent continuer à se connecter librement.`
          );
        } else {
          onUpdateUserAttempts?.(user.id, currentFailures);
          onRecordLoginAttempt?.(user.username, false, staffAuthMode, "Code PIN ou mot de passe erroné");
          setStaffError(
            `Code PIN ou mot de passe incorrect (${currentFailures}/5 tentatives avant blocage du compte par l'administrateur).`
          );
        }
      }
      return;
    }

    // 6. Succès : réinitialiser les tentatives échouées
    onUpdateUserAttempts?.(user.id, 0, undefined);

    // 7. Vérifier si 2FA est requis (Admin)
    if (user.role === 'ADMIN' && (user.is2FAEnabled || admin2FAEnforced)) {
      setPendingStaffUser(user);
      setIs2FAStep(true);
      setStaffError(null);
      return;
    }

    // 8. Connexion validée avec succès !
    finalizeStaffLogin(user, staffAuthMode);
  };

  // Validation du code 2FA
  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingStaffUser) return;

    const valid2FACodes = [pendingStaffUser.twoFactorSecret || '123456', '123456'];
    if (valid2FACodes.includes(twoFactorCode.trim())) {
      finalizeStaffLogin(pendingStaffUser, '2FA');
    } else {
      setStaffError("Code 2FA invalide. Entrez le code à 6 chiffres de votre application (ou code de secours : 123456).");
    }
  };

  const finalizeStaffLogin = (user: StaffUser, method: 'PIN' | 'PASSWORD' | '2FA') => {
    onUpdateUserAttempts?.(user.id, 0);
    setStaffSuccess(`Connexion réussie ! Bienvenue ${user.fullName} (${user.role}).`);
    onRecordLoginAttempt?.(user.username, true, method);

    // Transition fluide vers le cockpit
    setTimeout(() => {
      onStaffLogin(user, method);
    }, 450);
  };

  // ================= VALIDATION RÉELLE DU LOGIN CLIENT =================
  const handleClientLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);
    setAuthenticatedClient(null);

    // Normaliser le numéro de téléphone pour comparaison robuste
    const cleanInput = clientPhone.replace(/[\s\-\.\(\)]/g, '');
    if (!cleanInput) {
      setClientError("Veuillez saisir votre numéro de téléphone.");
      return;
    }

    // Recherche dans la base de clients
    const foundClient = clients.find((c) => {
      const cleanDB = c.phone.replace(/[\s\-\.\(\)]/g, '');
      return (
        cleanDB === cleanInput ||
        cleanDB.endsWith(cleanInput.slice(-9)) ||
        cleanInput.endsWith(cleanDB.slice(-9))
      );
    });

    if (!foundClient) {
      setClientError(
        `Aucun compte joueur trouvé pour le numéro ${clientPhone}. Rendez-vous à la caisse pour vous inscrire ou vérifiez votre numéro.`
      );
      return;
    }

    if (foundClient.portalDisabled) {
      setClientError(
        "L'accès à votre Espace Client a été désactivé par l'administrateur."
      );
      return;
    }

    // Vérification du code PIN à 4 chiffres
    const requiredPin = foundClient.pin || '1234';
    if (clientPin.trim() !== requiredPin) {
      setClientError("Code PIN incorrect pour ce compte joueur. Veuillez réessayer.");
      return;
    }

    // Client authentifié avec succès !
    setAuthenticatedClient(foundClient);
  };

  // Raccourci pour remplir rapidement des identifiants valides de test
  const applyDemoStaff = (username: string, pin: string, pass: string, mode: 'PIN' | 'PASSWORD') => {
    const user = staffUsers.find((u) => u.username === username) || staffUsers[0];
    setSelectedStaffUser(user);
    setStaffUsername(user.username);
    setStaffAuthMode(mode);
    setStaffPin(pin);
    setStaffPassword(pass);
    setStaffError(null);
    setIs2FAStep(false);
  };

  const applyDemoClient = (phone: string, pin: string) => {
    setClientPhone(phone);
    setClientPin(pin);
    setClientError(null);
    setAuthenticatedClient(null);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#050811] text-slate-100 font-sans overflow-x-hidden flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* ================= 1. FOND DESKTOP (LOGO GÉANT PLEIN ÉCRAN ASSOMBRI À DROITE) ================= */}
      <div className="hidden md:block fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {backgroundImageUrl &&
        backgroundImageUrl !== '/assets/aistudio/Kin_Gaming_Hub___univers_ne_on_des_jeux_vide_o_220341d3.png' ? (
          <img
            src={backgroundImageUrl}
            alt="Kin Gaming Hub Fond"
            className="w-full h-full object-cover object-center select-none transition-transform duration-1000"
          />
        ) : (
          <picture>
            <source srcSet="/assets/aistudio/kin_gaming_hub_bg_opt.webp" type="image/webp" />
            <img
              src="/assets/aistudio/Kin_Gaming_Hub___univers_ne_on_des_jeux_vide_o_220341d3.png"
              alt="Kin Gaming Hub Logo Fond"
              className="w-full h-full object-cover object-left-top select-none transform scale-105 transition-transform duration-1000"
            />
          </picture>
        )}

        {/* Dégradé latéral ultra-léger pour préserver la visibilité intégrale de l'image */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/15 to-black/35" />

        {/* Vignette périphérique pour estomper les bords flous blancs du logo */}
        <div className="absolute inset-0 shadow-[inset_0_0_120px_60px_#050811] pointer-events-none" />
      </div>

      {/* ================= 2. EN-TÊTE ÉPURÉ (SANS TITRE TEXTUEL REDONDANT) ================= */}
      <header className="relative z-10 w-full px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Statut Salle de Jeux */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300 shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Salle Ouverte · Kinshasa Gombe</span>
        </div>
      </header>

      {/* ================= 3. SUR TÉLÉPHONE : LOGO EN ENTIER EN HAUT ================= */}
      <div className="md:hidden relative w-full pt-1 px-4 z-10 flex flex-col items-center">
        <div className="relative w-full max-w-sm rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl shadow-black/80 bg-slate-950/50">
          {backgroundImageUrl &&
          backgroundImageUrl !== '/assets/aistudio/Kin_Gaming_Hub___univers_ne_on_des_jeux_vide_o_220341d3.png' ? (
            <img
              src={backgroundImageUrl}
              alt="Kin Gaming Hub Fond"
              className="w-full h-auto object-contain block"
            />
          ) : (
            <picture>
              <source srcSet="/assets/aistudio/kin_gaming_hub_bg_opt.webp" type="image/webp" />
              <img
                src="/assets/aistudio/Kin_Gaming_Hub___univers_ne_on_des_jeux_vide_o_220341d3.png"
                alt="Kin Gaming Hub Logo"
                className="w-full h-auto object-contain block"
              />
            </picture>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 shadow-[inset_0_0_40px_20px_#050811] pointer-events-none" />
        </div>
      </div>

      {/* ================= 4. ZONE PRINCIPALE : SPLIT DESKTOP & STACK MOBILE ================= */}
      <main className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-end px-4 sm:px-6 lg:px-12 py-4 md:py-12">
        <div className="hidden md:block flex-1" />

        {/* ================= CARTE DE CONNEXION RÉELLE (TRANSPARENTE GLASSMORPHISME) ================= */}
        <div className="w-full max-w-md bg-black/35 backdrop-blur-md border border-white/20 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/80 space-y-5 mt-4 md:mt-0 ring-1 ring-white/10">
          
          {/* ================= SÉLECTEUR D'ESPACE (DORÉ / BLEU) ================= */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-black/40 backdrop-blur-sm rounded-2xl border border-white/15 text-xs font-bold">
            {/* Onglet Personnel - Bleu */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('STAFF');
                setStaffError(null);
                setStaffSuccess(null);
                setIs2FAStep(false);
              }}
              className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'STAFF'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-lg shadow-blue-500/30'
                  : 'text-blue-400/80 hover:text-blue-300 hover:bg-slate-900'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Personnel</span>
            </button>

            {/* Onglet Espace Client - Doré */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('CLIENT');
                setClientError(null);
              }}
              className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'CLIENT'
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                  : 'text-amber-400/80 hover:text-amber-300 hover:bg-slate-900'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Espace Client</span>
            </button>
          </div>

          {/* ================= CONTENU 1 : VRAIE CONNEXION DU PERSONNEL ================= */}
          {activeTab === 'STAFF' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Étape 2FA pour Administrateur si requise */}
              {is2FAStep ? (
                <form onSubmit={handleVerify2FA} className="space-y-4">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl space-y-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      Double Authentification (2FA)
                    </span>
                    <h2 className="text-base font-bold text-white">
                      Code de sécurité {pendingStaffUser?.fullName}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Entrez le code à 6 chiffres généré par votre application (Google Authenticator ou code démo : 123456).
                    </p>
                  </div>

                  {staffError && (
                    <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{staffError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Code à 6 chiffres
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-center text-xl tracking-[0.5em] focus:ring-2 focus:ring-blue-500 outline-none transition"
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIs2FAStep(false)}
                      className="w-1/3 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/30 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Valider 2FA</span>
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-bold flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      Prise de poste sécurisée
                    </span>
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Authentification du Personnel
                    </h2>
                    <p className="text-xs text-slate-400">
                      Connectez-vous pour ouvrir votre caisse ou accéder aux réglages.
                    </p>
                  </div>

                  {/* Bascule Mode PIN Rapide vs Identifiant & Mot de passe */}
                  <div className="flex bg-black/40 backdrop-blur-sm p-1 rounded-xl border border-white/15 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setStaffAuthMode('PIN');
                        setStaffError(null);
                      }}
                      className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        staffAuthMode === 'PIN'
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Hash className="w-3.5 h-3.5" />
                      <span>Code PIN Rapide</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStaffAuthMode('PASSWORD');
                        setStaffError(null);
                      }}
                      className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        staffAuthMode === 'PASSWORD'
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Identifiant & Mot de passe</span>
                    </button>
                  </div>

                  {/* Messages de retour d'erreur ou succès */}
                  {staffError && (
                    <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-shake">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-semibold">{staffError}</span>
                      </div>
                    </div>
                  )}

                  {staffSuccess && (
                    <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-semibold">{staffSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleStaffLoginSubmit} className="space-y-3.5">
                    {staffAuthMode === 'PIN' ? (
                      <>
                        {/* Sélection du profil caissier/responsable */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-300 block">
                            Sélectionner votre profil
                          </label>
                          <select
                            value={selectedStaffUser.id}
                            onChange={(e) => handleSelectStaffUser(e.target.value)}
                            className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                          >
                            {staffUsers.map((u) => (
                              <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                                {u.fullName} — [{u.role}] {u.isBlocked ? '⚠️ [COMPTE BLOQUÉ]' : ''}
                              </option>
                            ))}
                          </select>
                          {selectedStaffUser.isBlocked && (
                            <div className="p-2 bg-rose-500/20 border border-rose-500/40 rounded-lg text-[11px] text-rose-300 flex items-center gap-1.5 mt-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>Ce compte est bloqué. Seul l'administrateur peut le débloquer.</span>
                            </div>
                          )}
                        </div>

                        {/* Saisie du code PIN */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-slate-300">
                              Code PIN de prise de service (4 chiffres)
                            </label>
                            <span className="text-[10px] text-blue-400 font-mono">
                              {selectedStaffUser.role === 'ADMIN' ? 'PIN: 9999' : 'PIN: 1234'}
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              maxLength={6}
                              value={staffPin}
                              onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ''))}
                              placeholder="••••"
                              autoFocus
                              className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-3.5 py-2.5 text-white font-mono text-center text-lg tracking-[0.4em] focus:ring-2 focus:ring-blue-500 outline-none transition"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Mode Identifiant + Mot de passe */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-300 block">
                            Identifiant utilisateur
                          </label>
                          <input
                            type="text"
                            value={staffUsername}
                            onChange={(e) => setStaffUsername(e.target.value)}
                            placeholder="ex: admin, gerant, erick"
                            className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none transition"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-300 block">
                            Mot de passe
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={staffPassword}
                              onChange={(e) => setStaffPassword(e.target.value)}
                              placeholder="Mot de passe"
                              className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-3.5 py-2.5 text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none transition"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Bouton de validation bleu */}
                    <button
                      type="submit"
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Ouvrir la session caisse</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* ================= CONTENU 2 : VRAIE CONNEXION CLIENT (DORÉE) ================= */}
          {activeTab === 'CLIENT' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Portail Joueur & Fidélité
                </span>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Espace Personnel Joueur
                </h2>
                <p className="text-xs text-slate-400">
                  Entrez votre numéro et votre code PIN pour consulter votre solde réel et vos privilèges.
                </p>
              </div>

              {clientError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-shake">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{clientError}</span>
                </div>
              )}

              <form onSubmit={handleClientLoginSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Numéro de Téléphone (RDC)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+243 89 545 7097"
                      className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:ring-2 focus:ring-amber-400 outline-none transition"
                      required
                    />
                    <Smartphone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300">
                      Code PIN Personnel (4 chiffres)
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">Défaut démo: 1234</span>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      maxLength={4}
                      value={clientPin}
                      onChange={(e) => setClientPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-3.5 py-2.5 text-white font-mono text-center text-lg tracking-[0.4em] focus:ring-2 focus:ring-amber-400 outline-none transition"
                      required
                    />
                  </div>
                </div>

                {/* Bouton doré "Voir mes points" conforme aux spécifications */}
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Award className="w-4 h-4 text-slate-950" />
                  <span>Voir mes points</span>
                </button>
              </form>

              {/* RÉSULTAT RÉEL DE LA CONNEXION DU CLIENT */}
              {authenticatedClient && (
                <div className="p-4 bg-amber-500/15 backdrop-blur-sm border border-amber-500/40 rounded-2xl space-y-3 animate-scaleUp">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{authenticatedClient.fullName}</span>
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono">
                        Code Joueur: {authenticatedClient.clientCode}
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      authenticatedClient.tier === 'VIP'
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                        : authenticatedClient.tier === 'FIDELE'
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-200'
                    }`}>
                      Rang {authenticatedClient.tier}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div className="bg-black/50 backdrop-blur-sm p-2.5 rounded-xl border border-white/10">
                      <div className="text-[10px] text-slate-400">Solde points fidélité</div>
                      <div className="text-xl font-black text-amber-400">
                        {authenticatedClient.loyaltyPoints} pts
                      </div>
                    </div>
                    <div className="bg-black/50 backdrop-blur-sm p-2.5 rounded-xl border border-white/10">
                      <div className="text-[10px] text-slate-400">Temps offert disponible</div>
                      <div className="text-xl font-black text-emerald-400">
                        {authenticatedClient.freeMinutesBalance} min
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onClientLogin(authenticatedClient)}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition cursor-pointer"
                  >
                    <span>Ouvrir l'Espace Joueur Complet</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= COMPTES DE TEST RAPIDES (ACCORDÉON DÉMO) ================= */}
          <div className="pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowDemoCredentials(!showDemoCredentials)}
              className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>Identifiants de test vérifiables</span>
              </span>
              <span className="text-[10px] text-slate-500">
                {showDemoCredentials ? 'Masquer' : 'Afficher'}
              </span>
            </button>

            {showDemoCredentials && (
              <div className="mt-2.5 p-3 bg-black/50 backdrop-blur-sm rounded-2xl border border-white/15 text-[11px] space-y-2 animate-fadeIn font-mono">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Personnel (Prise de poste) :
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyDemoStaff('admin', '9999', 'admin2026!', 'PIN')}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-blue-300 rounded-lg border border-slate-700 text-[10px] cursor-pointer"
                  >
                    Admin (PIN 9999 / 2FA 123456)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDemoStaff('gerant', '5555', 'gerant2026', 'PIN')}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-blue-300 rounded-lg border border-slate-700 text-[10px] cursor-pointer"
                  >
                    Gérant (PIN 5555)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDemoStaff('erick', '1234', 'caisse1234', 'PIN')}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-blue-300 rounded-lg border border-slate-700 text-[10px] cursor-pointer"
                  >
                    Caissier Erick (PIN 1234)
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-1 border-t border-slate-900">
                  Joueurs Fidélité :
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('CLIENT');
                      applyDemoClient('+243 82 567 8901', '1234');
                    }}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg border border-slate-700 text-[10px] cursor-pointer"
                  >
                    Glody (VIP · 840 pts)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('CLIENT');
                      applyDemoClient('+243 89 545 7097', '1234');
                    }}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg border border-slate-700 text-[10px] cursor-pointer"
                  >
                    Cedrick (Nouveau)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ================= 5. PIED DE PAGE DISCRET ================= */}
      <footer className="relative z-10 w-full px-6 py-3 text-center text-[10px] text-slate-500 font-mono">
        Kin Gaming Hub · Système de Gestion & Domotique IoT · Kinshasa, RDC
      </footer>
    </div>
  );
};
