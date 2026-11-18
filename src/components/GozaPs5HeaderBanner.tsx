import React from 'react';

interface GozaPs5HeaderBannerProps {
  venueName?: string;
}

/**
 * Bannière gaming animée inspirée de la manette PS5 DualSense
 * affichée dans la barre supérieure lorsque le menu est basculé en barre latérale gauche.
 */
export const GozaPs5HeaderBanner: React.FC<GozaPs5HeaderBannerProps> = ({
  venueName = 'GOZA',
}) => {
  const cleanName = (venueName || 'GOZA').trim().toUpperCase();

  return (
    <div
      aria-label={`Salle de jeux ${cleanName}`}
      className="hidden md:flex flex-1 items-center justify-center px-3 min-w-0 select-none"
    >
      <div className="relative overflow-hidden flex items-center gap-3 lg:gap-4 px-4 py-1.5 rounded-xl bg-gradient-to-r from-slate-950/90 via-[#0b152c]/95 to-slate-950/90 border border-cyan-500/25 shadow-[0_0_24px_rgba(6,182,212,0.14)] max-w-full">
        {/* Barre lumineuse DualSense animée en bas */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[2px] bg-blue-950/80 overflow-hidden">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-blue-500 animate-ps5-lightbar" />
        </div>

        {/* Bouton Home manette Xbox One */}
        <div
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-b from-slate-800 via-slate-900 to-black border border-emerald-400/50 shadow-[0_0_14px_rgba(16,185,129,0.35)] shrink-0"
          aria-hidden="true"
        >
          <svg viewBox="0 0 36 36" className="w-6 h-6">
            <defs>
              <clipPath id="xboxOneHeaderHomeClip">
                <circle cx="18" cy="18" r="13.5" />
              </clipPath>
              <radialGradient id="xboxOneHeaderHomeGlow" cx="50%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.28" />
                <stop offset="65%" stopColor="#0f172a" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#020617" stopOpacity="1" />
              </radialGradient>
            </defs>
            <circle
              cx="18"
              cy="18"
              r="14.2"
              fill="url(#xboxOneHeaderHomeGlow)"
              stroke="#34d399"
              strokeOpacity="0.7"
              strokeWidth="1.2"
            />
            <g clipPath="url(#xboxOneHeaderHomeClip)" className="animate-ps5-dpad-1">
              <path
                d="M 8.2 7.8 C 13 11.5, 16.2 15.2, 18 18 C 20.5 21.5, 24.5 25.5, 27.8 29.5 L 29.8 27.2 C 26 22.8, 22 19, 19.6 16 C 17 12.8, 13.5 9.2, 10.8 6.2 Z"
                fill="#ecfdf5"
              />
              <path
                d="M 27.8 7.8 C 23 11.5, 19.8 15.2, 18 18 C 15.5 21.5, 11.5 25.5, 8.2 29.5 L 6.2 27.2 C 10 22.8, 14 19, 16.4 16 C 19 12.8, 22.5 9.2, 25.2 6.2 Z"
                fill="#ecfdf5"
              />
            </g>
          </svg>
        </div>

        {/* Titre sublime Gaming "SALLE DE JEUX GOZA" */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-gaming text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300/90 whitespace-nowrap">
            SALLE DE JEUX
          </span>
          <span className="h-3.5 w-px bg-gradient-to-b from-transparent via-cyan-400/60 to-transparent shrink-0" />
          <span className="font-gaming text-sm lg:text-base xl:text-lg font-black uppercase tracking-[0.2em] bg-gradient-to-r from-cyan-300 via-white to-amber-300 animate-goza-shimmer bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(34,211,238,0.45)] whitespace-nowrap">
            {cleanName}
          </span>
        </div>

        {/* Les 4 touches emblématiques DualSense PS5 : Triangle, Boule (Rond), Croix (X), Carré */}
        <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
          {/* Triangle */}
          <span className="w-6 h-6 rounded-full bg-slate-900/90 border border-emerald-400/35 flex items-center justify-center shadow-[0_0_10px_rgba(52,211,153,0.22)] animate-ps5-float-1">
            <svg viewBox="0 0 20 20" className="w-3.5 h-3.5">
              <polygon
                points="10,3.5 16.5,15.5 3.5,15.5"
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          {/* Boule / Rond */}
          <span className="w-6 h-6 rounded-full bg-slate-900/90 border border-rose-400/35 flex items-center justify-center shadow-[0_0_10px_rgba(251,113,133,0.22)] animate-ps5-float-2">
            <svg viewBox="0 0 20 20" className="w-3.5 h-3.5">
              <circle
                cx="10"
                cy="10"
                r="5.6"
                fill="none"
                stroke="#fb7185"
                strokeWidth="2"
              />
            </svg>
          </span>

          {/* Croix / X */}
          <span className="w-6 h-6 rounded-full bg-slate-900/90 border border-sky-400/35 flex items-center justify-center shadow-[0_0_10px_rgba(56,189,248,0.25)] animate-ps5-float-3">
            <svg viewBox="0 0 20 20" className="w-3.5 h-3.5">
              <path
                d="M5 5 L15 15 M15 5 L5 15"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
            </svg>
          </span>

          {/* Carré */}
          <span className="w-6 h-6 rounded-full bg-slate-900/90 border border-fuchsia-400/35 flex items-center justify-center shadow-[0_0_10px_rgba(232,121,249,0.22)] animate-ps5-float-4">
            <svg viewBox="0 0 20 20" className="w-3.5 h-3.5">
              <rect
                x="4.5"
                y="4.5"
                width="11"
                height="11"
                rx="1.5"
                fill="none"
                stroke="#e879f9"
                strokeWidth="2"
              />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
};

export const GozaPs5HeroShowcase: React.FC<GozaPs5HeaderBannerProps> = ({
  venueName = 'GOZA',
}) => {
  const cleanName = (venueName || 'GOZA').trim().toUpperCase();

  return (
    <div
      aria-label={`Salle de jeux ${cleanName}`}
      className="relative overflow-hidden inline-flex flex-col gap-3.5 px-6 py-5 rounded-2xl bg-gradient-to-br from-slate-950/85 via-[#0b1630]/90 to-slate-950/85 backdrop-blur-md border border-cyan-400/30 shadow-[0_0_40px_rgba(6,182,212,0.18)] select-none max-w-full"
    >
      {/* Barre lumineuse DualSense PS5 animée en bas */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[3px] bg-blue-950/80 overflow-hidden">
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-blue-500 animate-ps5-lightbar" />
      </div>

      {/* Ligne supérieure : Croix directionnelle PS5 + "SALLE DE JEUX" + 4 touches DualSense */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Bouton Home manette Xbox One */}
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-b from-slate-800 via-slate-900 to-black border border-emerald-400/50 shadow-[0_0_18px_rgba(16,185,129,0.4)] shrink-0"
            aria-hidden="true"
          >
            <svg viewBox="0 0 36 36" className="w-8 h-8">
              <defs>
                <clipPath id="xboxOneHomeClip">
                  <circle cx="18" cy="18" r="13.5" />
                </clipPath>
                <radialGradient id="xboxOneHomeGlow" cx="50%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.28" />
                  <stop offset="65%" stopColor="#0f172a" stopOpacity="0.92" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="1" />
                </radialGradient>
              </defs>
              <circle
                cx="18"
                cy="18"
                r="14.2"
                fill="url(#xboxOneHomeGlow)"
                stroke="#34d399"
                strokeOpacity="0.7"
                strokeWidth="1.2"
              />
              <g clipPath="url(#xboxOneHomeClip)" className="animate-ps5-dpad-1">
                <path
                  d="M 8.2 7.8 C 13 11.5, 16.2 15.2, 18 18 C 20.5 21.5, 24.5 25.5, 27.8 29.5 L 29.8 27.2 C 26 22.8, 22 19, 19.6 16 C 17 12.8, 13.5 9.2, 10.8 6.2 Z"
                  fill="#ecfdf5"
                />
                <path
                  d="M 27.8 7.8 C 23 11.5, 19.8 15.2, 18 18 C 15.5 21.5, 11.5 25.5, 8.2 29.5 L 6.2 27.2 C 10 22.8, 14 19, 16.4 16 C 19 12.8, 22.5 9.2, 25.2 6.2 Z"
                  fill="#ecfdf5"
                />
              </g>
            </svg>
          </div>

          <span className="font-gaming text-xs lg:text-sm font-bold uppercase tracking-[0.26em] text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]">
            SALLE DE JEUX
          </span>
        </div>

        {/* Les 4 touches emblématiques DualSense PS5 : Triangle, Boule (Rond), Croix (X), Carré */}
        <div className="flex items-center gap-2 shrink-0" aria-hidden="true">
          <span className="w-8 h-8 rounded-full bg-slate-900/95 border border-emerald-400/40 flex items-center justify-center shadow-[0_0_14px_rgba(52,211,153,0.28)] animate-ps5-float-1">
            <svg viewBox="0 0 20 20" className="w-4 h-4">
              <polygon
                points="10,3.5 16.5,15.5 3.5,15.5"
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <span className="w-8 h-8 rounded-full bg-slate-900/95 border border-rose-400/40 flex items-center justify-center shadow-[0_0_14px_rgba(251,113,133,0.28)] animate-ps5-float-2">
            <svg viewBox="0 0 20 20" className="w-4 h-4">
              <circle
                cx="10"
                cy="10"
                r="5.6"
                fill="none"
                stroke="#fb7185"
                strokeWidth="2"
              />
            </svg>
          </span>

          <span className="w-8 h-8 rounded-full bg-slate-900/95 border border-sky-400/40 flex items-center justify-center shadow-[0_0_14px_rgba(56,189,248,0.3)] animate-ps5-float-3">
            <svg viewBox="0 0 20 20" className="w-4 h-4">
              <path
                d="M5 5 L15 15 M15 5 L5 15"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <span className="w-8 h-8 rounded-full bg-slate-900/95 border border-fuchsia-400/40 flex items-center justify-center shadow-[0_0_14px_rgba(232,121,249,0.28)] animate-ps5-float-4">
            <svg viewBox="0 0 20 20" className="w-4 h-4">
              <rect
                x="4.5"
                y="4.5"
                width="11"
                height="11"
                rx="1.5"
                fill="none"
                stroke="#e879f9"
                strokeWidth="2"
              />
            </svg>
          </span>
        </div>
      </div>

      {/* Nom monumental GOZA en typographie Gaming animée */}
      <div className="flex items-center gap-3">
        <span className="font-gaming text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black uppercase tracking-[0.22em] leading-none bg-gradient-to-r from-cyan-300 via-white to-amber-300 animate-goza-shimmer bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(34,211,238,0.45)]">
          {cleanName}
        </span>
      </div>
    </div>
  );
};
