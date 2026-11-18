import React from 'react';
import { Gamepad2 } from 'lucide-react';

interface GozaWordmarkProps {
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showIcon?: boolean;
  accent?: 'cyan' | 'amber';
  className?: string;
}

/**
 * Identité typographique Gaming / Esports de la salle GOZA.
 * Utilise la police display Orbitron et un contraste métallique cyan/ambre.
 */
export const GozaWordmark: React.FC<GozaWordmarkProps> = ({
  name = 'GOZA',
  size = 'md',
  showIcon = true,
  accent = 'cyan',
  className = '',
}) => {
  const displayName = (name || 'GOZA').trim() || 'GOZA';

  const sizeClasses: Record<NonNullable<GozaWordmarkProps['size']>, string> = {
    sm: 'text-base tracking-[0.14em]',
    md: 'text-lg lg:text-xl tracking-[0.15em]',
    lg: 'text-xl sm:text-2xl tracking-[0.16em]',
    hero: 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl tracking-[0.18em]',
  };

  const iconBoxClasses: Record<NonNullable<GozaWordmarkProps['size']>, string> = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-10 h-10 rounded-xl',
    hero: 'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl',
  };

  const iconSizeClasses: Record<NonNullable<GozaWordmarkProps['size']>, string> = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-5 h-5',
    hero: 'w-7 h-7 sm:w-8 sm:h-8',
  };

  const gradientText =
    accent === 'amber'
      ? 'bg-gradient-to-r from-white via-amber-200 to-amber-400'
      : 'bg-gradient-to-r from-white via-cyan-200 to-amber-300';

  const iconBg =
    accent === 'amber'
      ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/25 border border-amber-300/40'
      : 'bg-gradient-to-tr from-blue-600 via-cyan-500 to-amber-400 text-slate-950 shadow-lg shadow-cyan-500/25 border border-cyan-300/40';

  return (
    <span className={`inline-flex items-center gap-2.5 shrink-0 select-none ${className}`}>
      {showIcon && (
        <span
          className={`${iconBoxClasses[size]} ${iconBg} flex items-center justify-center shrink-0 relative overflow-hidden`}
          aria-hidden="true"
        >
          <Gamepad2 className={`${iconSizeClasses[size]} drop-shadow-sm`} />
        </span>
      )}
      <span
        className={`font-gaming font-black uppercase whitespace-nowrap leading-none ${sizeClasses[size]} ${gradientText} bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(6,182,212,0.28)]`}
      >
        {displayName}
      </span>
    </span>
  );
};
