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
  UserCog,
  Volume2,
  VolumeX,
  LayoutDashboard,
  PanelLeft,
  PanelTop,
} from 'lucide-react';
import { SystemSettings, StaffRole, StaffUser, Station } from '../types';
import { soundService } from '../services/soundService';
import { GozaPs5HeaderBanner } from './GozaPs5HeaderBanner';

export type ActiveTab = 
  | 'dashboard'
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

export type NavLayoutMode = 'horizontal' | 'sidebar';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  navLayout: NavLayoutMode;
  onToggleNavLayout: () => void;
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
  pendingSyncCount?: number;
  onSyncNow?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  navLayout,
  onToggleNavLayout,
  settings,
  setSettings,
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
  pendingSyncCount = 0,
  onSyncNow,
}) => {
  const role: StaffRole = currentStaffUser?.role || 'CAISSIER';
  const isAdmin = role === 'ADMIN';
  const isGerantOrAdmin = role === 'GERANT' || role === 'ADMIN';
  void stations;

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
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 w-full px-3 sm:px-6 lg:px-8 2xl:px-10 py-2 sm:py-2.5">
      <div className="w-full max-w-[2400px] mx-auto flex items-center justify-between gap-2 sm:gap-4 lg:gap-6">
        {/* Zone 2: Navigation Links selon les rôles RBAC (mode horizontal) */}
        {navLayout === 'horizontal' ? (
          <nav className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar py-1 scroll-smooth">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Tableau de bord</span>
            </button>

            <button
              onClick={() => setActiveTab('stations')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 relative cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guide & Tests</span>
            </button>
          </nav>
        ) : (
          <GozaPs5HeaderBanner venueName={settings.venueName || 'GOZA'} />
        )}

        {/* Zone 3: Profil Équipier, Admin Tools, Status */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Bouton bascule position menu : Latéral gauche sous GOZA <-> Horizontal */}
          <button
            type="button"
            onClick={onToggleNavLayout}
            title={
              navLayout === 'horizontal'
                ? 'Passer le menu en barre latérale gauche (sous GOZA)'
                : 'Remettre le menu en barre horizontale en haut'
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition cursor-pointer shrink-0"
          >
            {navLayout === 'horizontal' ? (
              <>
                <PanelLeft className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Menu latéral</span>
              </>
            ) : (
              <>
                <PanelTop className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Menu horizontal</span>
              </>
            )}
          </button>

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

          {/* Bouton rapide Test & Choix Voix Humaine (Féminine / Mâle) - visible sur TOUS les écrans */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => {
                const gender = settings.voiceGender || 'FEMALE';
                soundService.playTestVoiceAndSound(gender);
              }}
              title={
                settings.soundAlertsEnabled && (settings.voiceAlertsEnabled ?? true)
                  ? `Tester l'alerte parlante (${settings.voiceGender === 'MALE' ? 'Voix Masculine' : 'Voix Féminine'})`
                  : 'Alertes sonores/vocales désactivées (cliquer pour test audio)'
              }
              className={`flex items-center gap-1 px-2 py-1.5 sm:py-1 text-[11px] font-semibold transition cursor-pointer ${
                settings.soundAlertsEnabled && (settings.voiceAlertsEnabled ?? true)
                  ? 'text-cyan-300 hover:bg-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {settings.soundAlertsEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="hidden lg:inline">Voix</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const nextGender = settings.voiceGender === 'MALE' ? 'FEMALE' : 'MALE';
                soundService.setVoiceGender(nextGender);
                setSettings((prev) => ({ ...prev, voiceGender: nextGender }));
                soundService.playTestVoiceAndSound(nextGender);
              }}
              title="Basculer entre Voix Féminine et Voix Masculine (et tester)"
              className={`px-2 sm:px-1.5 py-1.5 sm:py-1 text-[10px] font-mono font-bold border-l border-slate-700 transition cursor-pointer ${
                settings.voiceGender === 'MALE'
                  ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                  : 'bg-pink-500/20 text-pink-300 hover:bg-pink-500/30'
              }`}
            >
              {settings.voiceGender === 'MALE' ? 'H' : 'F'}
            </button>
          </div>

          {/* Connectivité Internet & File de Synchronisation Hors-Ligne */}
          <button
            type="button"
            onClick={() => {
              if (isOnline && pendingSyncCount > 0 && onSyncNow) {
                onSyncNow();
              }
            }}
            title={
              isOnline
                ? pendingSyncCount > 0
                  ? `${pendingSyncCount} élément(s) en attente — Cliquer pour synchroniser`
                  : 'Réseau opérationnel & synchronisé'
                : `Mode Hors-ligne — ${pendingSyncCount} opération(s) en file d'attente locale`
            }
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono font-medium transition ${
              isOnline
                ? pendingSyncCount > 0
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-pointer hover:bg-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {pendingSyncCount > 0 && (
              <span className="px-1 py-0.2 bg-amber-500 text-slate-950 font-black text-[10px] rounded">
                {pendingSyncCount}
              </span>
            )}
          </button>

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
                  <div className="sm:hidden px-2.5 py-1.5 mb-1 rounded-lg bg-slate-800/70 border border-slate-700/70 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Taux du jour :</span>
                    <span className="text-emerald-400 font-mono font-bold">1$ = {settings.exchangeRate.toLocaleString()} FC</span>
                  </div>

                  {isAdmin && (
                    <div className="md:hidden pb-1.5 mb-1 border-b border-slate-800 space-y-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onOpenWhatsAppConfig();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-emerald-300 hover:bg-slate-800 transition cursor-pointer text-left"
                      >
                        <MessageSquare className="w-4 h-4 shrink-0" />
                        <span>Configuration WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onOpenTierSettings();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-amber-300 hover:bg-slate-800 transition cursor-pointer text-left"
                      >
                        <Sliders className="w-4 h-4 shrink-0" />
                        <span>Seuils Statuts Fidèle/VIP</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onOpenStaffManagement();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-cyan-300 hover:bg-slate-800 transition cursor-pointer text-left"
                      >
                        <Shield className="w-4 h-4 shrink-0" />
                        <span>Gestion Personnel &amp; Accès</span>
                      </button>
                    </div>
                  )}

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

interface SidebarNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentStaffUser: StaffUser | null;
  waitingCount: number;
  onSwitchToHorizontal: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  setActiveTab,
  currentStaffUser,
  waitingCount,
  onSwitchToHorizontal,
}) => {
  const role: StaffRole = currentStaffUser?.role || 'CAISSIER';
  const isGerantOrAdmin = role === 'GERANT' || role === 'ADMIN';

  return (
    <aside className="w-full lg:w-60 xl:w-64 2xl:w-72 shrink-0 bg-slate-900/95 backdrop-blur-md border-b lg:border-b-0 lg:border-r border-slate-800 px-3 py-2.5 lg:py-4 flex flex-col justify-between gap-3 lg:sticky lg:top-[61px] lg:h-[calc(100vh-61px)] lg:overflow-y-auto z-30">
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-800/80">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </span>
          <button
            type="button"
            onClick={onSwitchToHorizontal}
            title="Remettre le menu en haut (horizontal)"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition cursor-pointer"
          >
            <PanelTop className="w-3 h-3" />
            <span>Horizontal</span>
          </button>
        </div>

        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 lg:w-full text-left cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Tableau de bord</span>
          </button>

          <button
            onClick={() => setActiveTab('stations')}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 lg:w-full text-left cursor-pointer ${
              activeTab === 'stations'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Tv className="w-4 h-4 shrink-0" />
            <span>Postes Live</span>
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 lg:w-full text-left cursor-pointer ${
              activeTab === 'tickets'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Gamepad2 className="w-4 h-4 shrink-0" />
            <span>Billetterie</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 lg:w-full text-left cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Users className="w-4 h-4 shrink-0" />
              <span>File d'attente</span>
            </span>
            {waitingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full">
                {waitingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('loyalty')}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 lg:w-full text-left cursor-pointer ${
              activeTab === 'loyalty'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>Fidélité & Statuts</span>
          </button>

          {isGerantOrAdmin && (
            <button
              onClick={() => setActiveTab('domotique')}
              className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 lg:w-full text-left cursor-pointer ${
                activeTab === 'domotique'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Zap className="w-4 h-4 shrink-0" />
              <span>Domotique IoT</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('cash')}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 lg:w-full text-left cursor-pointer ${
              activeTab === 'cash'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>Caisse & Snacks</span>
          </button>

          {isGerantOrAdmin && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 lg:w-full text-left cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Rapports</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 lg:w-full text-left cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Guide & Tests</span>
          </button>
        </nav>
      </div>
    </aside>
  );
};
