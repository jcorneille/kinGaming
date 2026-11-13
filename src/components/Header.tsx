import React, { useState, useRef, useEffect } from 'react';
import {
  Gamepad2,
  Tv,
  Users,
  Award,
  Zap,
  ShoppingBag,
  BarChart3,
  BookOpen,
  Wifi,
  WifiOff,
  UserCheck,
  Download,
  Lock,
  Sliders,
  Shield,
  MessageSquare,
  LogOut,
  ChevronDown,
  UserCog
} from 'lucide-react';
import { SystemSettings, StaffRole, StaffUser, Station } from '../types';

export type ActiveTab = 
  | 'stations' 
  | 'tickets' 
  | 'queue' 
  | 'loyalty' 
  | 'domotique' 
  | 'cash' 
  | 'reports' 
  | 'guide'
  | 'customer_portal'
  | 'settings'
  | 'login';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  stations?: Station[];
  currentStaffUser: StaffUser | null;
  onLockSession: () => void;
  onLogout: () => void;
  onOpenTierSettings: () => void;
  onOpenStaffManagement: () => void;
  onOpenWhatsAppConfig: () => void;
  onOpenProfile: () => void;
  isOnline: boolean;
  isInstallable: boolean;
  onInstall: () => void;
  waitingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  stations = [],
  currentStaffUser,
  onLockSession,
  onLogout,
  onOpenTierSettings,
  onOpenStaffManagement,
  onOpenWhatsAppConfig,
  onOpenProfile,
  isOnline,
  isInstallable,
  onInstall,
  waitingCount,
}) => {
  const role: StaffRole = currentStaffUser?.role || 'CAISSIER';
  const isAdmin = role === 'ADMIN';
  const isGerantOrAdmin = role === 'GERANT' || role === 'ADMIN';
  const ps4Count = stations.length > 0 ? stations.filter((s) => s.type === 'PS4').length : 8;
  const ps5Count = stations.length > 0 ? stations.filter((s) => s.type === 'PS5').length : 2;

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 lg:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Brand Wordmark (Clic vers page d'accueil login) */}
        <button
          onClick={() => setActiveTab('login')}
          className="flex items-center gap-2.5 shrink-0 text-left hover:opacity-90 transition cursor-pointer"
          title="Accueil & Connexion"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base lg:text-lg font-bold tracking-tight text-white whitespace-nowrap">
              Kin Gaming Hub
            </span>
            <div className="text-[10px] text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
              <span>{ps4Count} PS4</span>
              <span>·</span>
              <span className="text-cyan-400 font-semibold">{ps5Count} PS5</span>
              <span>·</span>
              <span>KINSHASA</span>
            </div>
          </div>
        </button>

        {/* Zone 2: Navigation Links selon les rôles RBAC */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveTab('stations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'stations'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Postes Live</span>
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'tickets'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Billetterie</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 relative ${
              activeTab === 'queue'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>File d'attente</span>
            {waitingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full">
                {waitingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('loyalty')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'loyalty'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Fidélité & Statuts</span>
          </button>

          {/* Domotique accessible Gérant et Admin */}
          {isGerantOrAdmin && (
            <button
              onClick={() => setActiveTab('domotique')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'domotique'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Domotique IoT</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('cash')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'cash'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Caisse & Snacks</span>
          </button>

          {/* Rapports réservés Gérant et Admin */}
          {isGerantOrAdmin && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Rapports</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'guide'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Guide & Tests</span>
          </button>

          {/* Accès Portail Joueur (Espace Client aux couleurs dorées du logo) */}
          <button
            onClick={() => setActiveTab('customer_portal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'customer_portal'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-400'
                : 'bg-amber-950/40 border border-amber-500/50 text-amber-300 hover:bg-amber-900/60 hover:text-white shadow-sm'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Espace Client</span>
          </button>

          {/* Réglages UNIQUEMENT visibles et accessibles par l'Administrateur (Section 2.18) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('settings')}
              title="Panneau de Configuration Administrateur (Prix PS4/PS5, Taux $, Domotique, Sécurité...)"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-rose-400'
                  : 'bg-rose-950/40 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-rose-400" />
              <span>Configuration</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Profil Équipier, Admin Tools, Status */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Taux de change bidevise */}
          <div className="hidden sm:flex items-center bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400 mr-1.5">Taux :</span>
            <span className="text-emerald-400 font-mono font-semibold">1$ = {settings.exchangeRate.toLocaleString()} FC</span>
          </div>

          {/* Boutons Admin Exclusifs : Config Statuts & Gestion Personnel */}
          {isAdmin && (
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={onOpenWhatsAppConfig}
                title="Configuration WhatsApp Business Cloud API & Modèles Meta"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg transition"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenTierSettings}
                title="Configuration des Seuils et Règles de Statuts Fidèle/VIP"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg transition"
              >
                <Sliders className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenStaffManagement}
                title="Gestion des Comptes Utilisateurs & Contrôle d'Accès"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg transition"
              >
                <Shield className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Connectivité Internet */}
          <div
            title={isOnline ? 'Réseau opérationnel' : 'Mode Hors-ligne — Cache local'}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-medium ${
              isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          </div>

          {/* Menu Déroulant Profil Utilisateur (Mon profil, Verrouiller, Déconnexion) */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              title="Menu session utilisateur"
              className={`flex items-center gap-2 bg-slate-800 hover:bg-slate-700/90 border rounded-lg px-2.5 py-1 text-xs transition cursor-pointer ${
                isProfileMenuOpen ? 'border-cyan-500/60 ring-1 ring-cyan-500/30' : 'border-slate-700'
              }`}
            >
              {currentStaffUser?.avatarUrl ? (
                <img
                  src={currentStaffUser.avatarUrl}
                  alt={currentStaffUser.fullName}
                  className="w-6 h-6 rounded-full object-cover border border-cyan-400/70 shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-700 border border-cyan-500/40 flex items-center justify-center shrink-0">
                  <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              )}
              <div className="flex flex-col leading-tight text-left">
                <span className="font-bold text-white truncate max-w-[100px]">
                  {currentStaffUser?.fullName.split(' ')[0] || 'Personnel'}
                </span>
                <span className="text-[9px] font-mono font-semibold text-cyan-400">
                  {currentStaffUser?.role || 'CAISSIER'}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                  isProfileMenuOpen ? 'rotate-180 text-cyan-400' : ''
                }`}
              />
            </button>

            {isProfileMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/60 py-1.5 z-50"
              >
                <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center gap-2.5">
                  {currentStaffUser?.avatarUrl ? (
                    <img
                      src={currentStaffUser.avatarUrl}
                      alt={currentStaffUser.fullName}
                      className="w-9 h-9 rounded-full object-cover border border-cyan-400/70 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-cyan-500/40 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4 text-cyan-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {currentStaffUser?.fullName || 'Personnel'}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      @{currentStaffUser?.username || 'staff'} · {currentStaffUser?.role || 'CAISSIER'}
                    </p>
                  </div>
                </div>

                <div className="p-1.5 space-y-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenProfile();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition cursor-pointer text-left"
                  >
                    <UserCog className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <div className="font-semibold">Mon profil</div>
                      <div className="text-[10px] text-slate-400">Photo, nom & mot de passe</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLockSession();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition cursor-pointer text-left"
                  >
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold">Verrouiller / Changer caissier</div>
                      <div className="text-[10px] text-slate-400">Bascule rapide par code PIN</div>
                    </div>
                  </button>
                </div>

                <div className="border-t border-slate-800 p-1.5 mt-0.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-bold text-rose-300 hover:bg-rose-600/20 hover:text-rose-200 transition cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bouton PWA Install */}
          {isInstallable && (
            <button
              onClick={onInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors whitespace-nowrap shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Installer</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
