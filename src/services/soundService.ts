/**
 * Service de synthèse sonore & alertes parlantes (Web Audio API + Web Speech API TTS en français).
 * Aucun fichier externe requis, déverrouillage automatique sur interaction utilisateur.
 */

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
let speechUnlocked = false;
let cachedVoices: SpeechSynthesisVoice[] = [];
let listenersAttached = false;
let lastSpokenText = '';
let lastSpokenAt = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function refreshVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      cachedVoices = voices;
    }
  } catch {
    // Ignore
  }
  return cachedVoices;
}

function pickFrenchVoice(): SpeechSynthesisVoice | null {
  const voices = refreshVoices();
  if (voices.length === 0) return null;

  // Priorité : fr-CD / fr-FR / fr-BE / fr-CA / toute voix française
  const exact = voices.find((v) =>
    ['fr-FR', 'fr-CD', 'fr-BE', 'fr-CA', 'fr-CH'].includes(v.lang)
  );
  if (exact) return exact;

  const anyFrench = voices.find((v) => v.lang.toLowerCase().startsWith('fr'));
  return anyFrench || null;
}

function unlockAudioAndSpeech(): void {
  if (typeof window === 'undefined') return;

  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().then(() => {
      audioUnlocked = true;
    }).catch(() => {});
  } else if (ctx && ctx.state === 'running') {
    audioUnlocked = true;
  }

  if ('speechSynthesis' in window && !speechUnlocked) {
    try {
      refreshVoices();
      // Amorce silencieuse pour débloquer la synthèse vocale dans les navigateurs stricts / iframes
      const primer = new SpeechSynthesisUtterance('');
      primer.volume = 0;
      primer.lang = 'fr-FR';
      window.speechSynthesis.speak(primer);
      speechUnlocked = true;
    } catch {
      // Ignore
    }
  }
}

function ensureUnlockListeners(): void {
  if (typeof window === 'undefined' || listenersAttached) return;
  listenersAttached = true;

  const onUserGesture = () => {
    unlockAudioAndSpeech();
  };

  window.addEventListener('pointerdown', onUserGesture, { passive: true });
  window.addEventListener('keydown', onUserGesture, { passive: true });
  window.addEventListener('touchstart', onUserGesture, { passive: true });

  if ('speechSynthesis' in window) {
    refreshVoices();
    try {
      window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    } catch {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
  }
}

if (typeof window !== 'undefined') {
  ensureUnlockListeners();
}

export interface SpeechDiagnostic {
  supported: boolean;
  audioSupported: boolean;
  unlocked: boolean;
  voiceCount: number;
  frenchVoiceName: string | null;
}

export const soundService = {
  ensureInitialized() {
    ensureUnlockListeners();
    unlockAudioAndSpeech();
  },

  getSpeechStatus(): SpeechDiagnostic {
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    const audioSupported =
      typeof window !== 'undefined' &&
      Boolean(window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    const voices = refreshVoices();
    const frVoice = pickFrenchVoice();
    return {
      supported,
      audioSupported,
      unlocked: audioUnlocked || speechUnlocked,
      voiceCount: voices.length,
      frenchVoiceName: frVoice ? `${frVoice.name} (${frVoice.lang})` : null,
    };
  },

  /**
   * Synthèse vocale en français (alerte parlante)
   */
  speak(
    text: string,
    options?: {
      interrupt?: boolean;
      rate?: number;
      pitch?: number;
      volume?: number;
      delayMs?: number;
    }
  ): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      return false;
    }
    const cleanText = text.trim();
    if (!cleanText) return false;

    const now = Date.now();
    // Anti-rebond court pour éviter double annonce identique simultanée
    if (cleanText === lastSpokenText && now - lastSpokenAt < 1800) {
      return true;
    }
    lastSpokenText = cleanText;
    lastSpokenAt = now;

    const triggerSpeak = () => {
      try {
        const synth = window.speechSynthesis;
        if (options?.interrupt !== false) {
          synth.cancel();
        }
        // Sécurité Chrome : débloquer si la file synth s'est mise en pause
        if (synth.paused) {
          synth.resume();
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'fr-FR';
        utterance.rate = options?.rate ?? 1.0;
        utterance.pitch = options?.pitch ?? 1.0;
        utterance.volume = options?.volume ?? 1.0;

        const frVoice = pickFrenchVoice();
        if (frVoice) {
          utterance.voice = frVoice;
          utterance.lang = frVoice.lang;
        }

        synth.speak(utterance);
        speechUnlocked = true;
      } catch {
        // Ignorer silencieusement si restreint
      }
    };

    const delay = options?.delayMs ?? 0;
    if (delay > 0) {
      window.setTimeout(triggerSpeak, delay);
    } else {
      triggerSpeak();
    }
    return true;
  },

  /**
   * Ding-dong harmonieux d'appel client de la file d'attente
   */
  playQueueCallChime() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const playNotes = () => {
        const now = ctx.currentTime;
        // Note 1: Sol 5 (784Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(783.99, now);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.55);

        // Note 2: Do 5 (523Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(523.25, now + 0.25);
        gain2.gain.setValueAtTime(0.35, now + 0.25);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.25);
        osc2.stop(now + 0.9);
      };
      if (ctx.state === 'suspended') {
        void ctx.resume().then(playNotes).catch(() => {});
      } else {
        playNotes();
      }
    } catch {
      // Ignorer silencieusement si la lecture audio est restreinte
    }
  },

  /**
   * Alerte de fin de session imminente (5 min / 1 min) ou fin de temps
   */
  playSessionEndAlert(isFinal = true) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const playTone = () => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = isFinal ? 'triangle' : 'sine';

        if (isFinal) {
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.setValueAtTime(523.25, now + 0.2);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
        } else {
          osc.frequency.setValueAtTime(659.25, now);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        }

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.55);
      };
      if (ctx.state === 'suspended') {
        void ctx.resume().then(playTone).catch(() => {});
      } else {
        playTone();
      }
    } catch {
      // Ignorer
    }
  },

  /**
   * Son de succès à l'encaissement et à l'impression du ticket
   */
  playTicketSuccess() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const playChord = () => {
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.25, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.4);
        });
      };
      if (ctx.state === 'suspended') {
        void ctx.resume().then(playChord).catch(() => {});
      } else {
        playChord();
      }
    } catch {
      // Ignorer
    }
  },

  /**
   * Bip d'avertissement de coupure ou d'erreur
   */
  playWarningBeep() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const playBeep = () => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(380, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      };
      if (ctx.state === 'suspended') {
        void ctx.resume().then(playBeep).catch(() => {});
      } else {
        playBeep();
      }
    } catch {
      // Ignorer
    }
  },

  /**
   * Alertes parlantes combinées (Carillon + Annonce vocale en français)
   */
  playQueueCallAlert(clientName?: string, stationNumber?: number | string, voiceEnabled = true) {
    this.playQueueCallChime();
    if (!voiceEnabled) return;
    const who = clientName ? clientName : 'Client suivant';
    const stationPart = stationNumber ? `, veuillez vous présenter au poste ${stationNumber}.` : ', votre poste est prêt à l’accueil.';
    this.speak(`Appel client : ${who}${stationPart}`, { delayMs: 650, interrupt: true });
  },

  playSession5MinAlert(stationName: string, clientName?: string, voiceEnabled = true) {
    this.playSessionEndAlert(false);
    if (!voiceEnabled) return;
    const who = clientName ? ` pour ${clientName}` : '';
    this.speak(`Attention, il reste 5 minutes sur ${stationName}${who}.`, { delayMs: 420, interrupt: false });
  },

  playSession1MinAlert(stationName: string, clientName?: string, voiceEnabled = true) {
    this.playSessionEndAlert(true);
    if (!voiceEnabled) return;
    const who = clientName ? `, joueur ${clientName}` : '';
    this.speak(`Attention, dernière minute de jeu sur ${stationName}${who}.`, { delayMs: 520, interrupt: true });
  },

  playSessionEndSpokenAlert(stationName: string, clientName?: string, voiceEnabled = true) {
    this.playSessionEndAlert(true);
    if (!voiceEnabled) return;
    const who = clientName ? ` pour ${clientName}` : '';
    this.speak(`Temps écoulé sur ${stationName}${who}. Fin de session et libération du poste.`, {
      delayMs: 520,
      interrupt: true,
    });
  },

  playCashierWarningAlert(spokenText: string, voiceEnabled = true) {
    this.playWarningBeep();
    if (!voiceEnabled) return;
    this.speak(spokenText, { delayMs: 350, interrupt: true });
  },

  playTestVoiceAndSound(): SpeechDiagnostic {
    this.ensureInitialized();
    this.playQueueCallChime();
    this.speak('Test des alertes parlantes Kin Gaming Hub réussi. Le système vocal est opérationnel.', {
      delayMs: 650,
      interrupt: true,
    });
    return this.getSpeechStatus();
  },

  /**
   * Alias pour compatibilité
   */
  playQueueCall() {
    this.playQueueCallChime();
  },

  playAlertWarning() {
    this.playWarningBeep();
  },
};
