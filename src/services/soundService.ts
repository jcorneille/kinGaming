/**
 * Service de synthèse sonore & alertes parlantes humaines (Gemini 3.8 TTS + Web Speech API + Web Audio API).
 * Prend en charge le choix entre Voix Féminine humaine et Voix Masculine humaine, avec cache audio et repli hors-ligne.
 */

export type VoiceGender = 'FEMALE' | 'MALE';

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
let speechUnlocked = false;
let cachedVoices: SpeechSynthesisVoice[] = [];
let listenersAttached = false;
let lastSpokenText = '';
let lastSpokenAt = 0;
let activeVoiceGender: VoiceGender = 'FEMALE';
let currentTtsSource: AudioBufferSourceNode | null = null;
let speakRequestSeq = 0;

const clientAudioBufferCache = new Map<string, AudioBuffer>();

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

const FEMALE_VOICE_HINTS = [
  'denise', 'hortense', 'julie', 'amelie', 'amélie', 'celine', 'céline',
  'virginie', 'audrey', 'aurelie', 'aurélie', 'claire', 'lea', 'léa',
  'chloe', 'chloé', 'marion', 'eloise', 'vivienne', 'brigitte', 'female', 'femme',
];

const MALE_VOICE_HINTS = [
  'henri', 'paul', 'thomas', 'claude', 'nicolas', 'jerome', 'jérôme',
  'alain', 'antoine', 'remy', 'rémy', 'guillaume', 'sebastien', 'male', 'homme',
];

function pickFrenchVoice(gender: VoiceGender): { voice: SpeechSynthesisVoice | null; matchedGender: boolean } {
  const voices = refreshVoices();
  if (voices.length === 0) return { voice: null, matchedGender: false };

  const frenchVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('fr'));
  const pool = frenchVoices.length > 0 ? frenchVoices : voices;
  const hints = gender === 'MALE' ? MALE_VOICE_HINTS : FEMALE_VOICE_HINTS;

  const gendered = pool.find((v) => {
    const lower = v.name.toLowerCase();
    return hints.some((h) => lower.includes(h));
  });
  if (gendered) return { voice: gendered, matchedGender: true };

  // Sinon, privilégier une voix Google/Microsoft/Apple française naturelle
  const naturalFr = frenchVoices.find(
    (v) => v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('google')
  );
  return { voice: naturalFr || frenchVoices[0] || null, matchedGender: false };
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

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function stopCurrentTtsPlayback(): void {
  if (currentTtsSource) {
    try {
      currentTtsSource.stop();
    } catch {
      // Ignore
    }
    currentTtsSource = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

function speakViaBrowserFallback(
  cleanText: string,
  gender: VoiceGender,
  options?: { interrupt?: boolean; rate?: number; volume?: number }
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return;
  }
  try {
    const synth = window.speechSynthesis;
    if (options?.interrupt !== false) {
      synth.cancel();
    }
    if (synth.paused) {
      synth.resume();
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    utterance.rate = options?.rate ?? 0.98;
    utterance.volume = options?.volume ?? 1.0;

    const { voice, matchedGender } = pickFrenchVoice(gender);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.pitch = matchedGender ? 1.0 : gender === 'MALE' ? 0.84 : 1.08;
    } else {
      utterance.pitch = gender === 'MALE' ? 0.84 : 1.08;
    }

    synth.speak(utterance);
    speechUnlocked = true;
  } catch {
    // Ignore
  }
}

async function speakViaHumanGeminiTTS(
  cleanText: string,
  gender: VoiceGender,
  reqId: number,
  options?: { interrupt?: boolean; rate?: number; volume?: number }
): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const cacheKey = `${gender}:${cleanText}`;
    let decodedBuffer = clientAudioBufferCache.get(cacheKey);

    if (!decodedBuffer) {
      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, gender }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json().catch(() => ({}));
      if (!data?.audioBase64) {
        return false;
      }

      const arrayBuf = base64ToArrayBuffer(data.audioBase64);
      decodedBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));

      if (clientAudioBufferCache.size >= 60) {
        const oldestKey = clientAudioBufferCache.keys().next().value;
        if (oldestKey) clientAudioBufferCache.delete(oldestKey);
      }
      clientAudioBufferCache.set(cacheKey, decodedBuffer);
    }

    // Si une nouvelle annonce prioritaire est arrivée pendant le fetch, ne pas superposer
    if (reqId !== speakRequestSeq && options?.interrupt !== false) {
      return true;
    }

    if (options?.interrupt !== false) {
      stopCurrentTtsPlayback();
    }

    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const source = ctx.createBufferSource();
    source.buffer = decodedBuffer;
    const gainNode = ctx.createGain();
    gainNode.gain.value = options?.volume ?? 1.0;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    currentTtsSource = source;
    source.onended = () => {
      if (currentTtsSource === source) {
        currentTtsSource = null;
      }
    };
    source.start(0);
    audioUnlocked = true;
    return true;
  } catch {
    return false;
  }
}

export interface SpeechDiagnostic {
  supported: boolean;
  audioSupported: boolean;
  unlocked: boolean;
  voiceCount: number;
  frenchVoiceName: string | null;
  voiceGender: VoiceGender;
}

export const soundService = {
  ensureInitialized() {
    ensureUnlockListeners();
    unlockAudioAndSpeech();
  },

  setVoiceGender(gender: VoiceGender) {
    activeVoiceGender = gender === 'MALE' ? 'MALE' : 'FEMALE';
  },

  getVoiceGender(): VoiceGender {
    return activeVoiceGender;
  },

  getSpeechStatus(): SpeechDiagnostic {
    const supported =
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined';
    const audioSupported =
      typeof window !== 'undefined' &&
      Boolean(
        window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      );
    const voices = refreshVoices();
    const { voice } = pickFrenchVoice(activeVoiceGender);
    return {
      supported,
      audioSupported,
      unlocked: audioUnlocked || speechUnlocked,
      voiceCount: voices.length,
      frenchVoiceName: voice ? `${voice.name} (${voice.lang})` : null,
      voiceGender: activeVoiceGender,
    };
  },

  /**
   * Synthèse vocale humaine en français (Gemini TTS Voix Féminine/Masculine + Repli navigateur)
   */
  speak(
    text: string,
    options?: {
      gender?: VoiceGender;
      interrupt?: boolean;
      rate?: number;
      pitch?: number;
      volume?: number;
      delayMs?: number;
    }
  ): boolean {
    if (typeof window === 'undefined') return false;
    const cleanText = text.trim();
    if (!cleanText) return false;

    const gender = options?.gender || activeVoiceGender;
    const now = Date.now();
    if (cleanText === lastSpokenText && now - lastSpokenAt < 1800) {
      return true;
    }
    lastSpokenText = cleanText;
    lastSpokenAt = now;

    const reqId = ++speakRequestSeq;

    const executeSpeak = async () => {
      const playedHuman = await speakViaHumanGeminiTTS(cleanText, gender, reqId, options);
      if (!playedHuman) {
        speakViaBrowserFallback(cleanText, gender, options);
      }
    };

    const delay = options?.delayMs ?? 0;
    if (delay > 0) {
      window.setTimeout(() => {
        void executeSpeak();
      }, delay);
    } else {
      void executeSpeak();
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
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(783.99, now);
        gain1.gain.setValueAtTime(0.28, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.5);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(523.25, now + 0.22);
        gain2.gain.setValueAtTime(0.32, now + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.22);
        osc2.stop(now + 0.8);
      };
      if (ctx.state === 'suspended') {
        void ctx.resume().then(playNotes).catch(() => {});
      } else {
        playNotes();
      }
    } catch {
      // Ignorer
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
          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        } else {
          osc.frequency.setValueAtTime(659.25, now);
          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        }

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
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
   * Alertes parlantes combinées (Carillon + Voix Humaine FR)
   */
  playQueueCallAlert(clientName?: string, stationNumber?: number | string, voiceEnabled = true, gender?: VoiceGender) {
    this.playQueueCallChime();
    if (!voiceEnabled) return;
    const who = clientName ? clientName : 'Client suivant';
    const stationPart = stationNumber
      ? `, veuillez vous présenter au poste ${stationNumber}.`
      : ', votre poste est prêt à l’accueil.';
    this.speak(`Appel client : ${who}${stationPart}`, { delayMs: 550, interrupt: true, gender });
  },

  playSession5MinAlert(stationName: string, clientName?: string, voiceEnabled = true, gender?: VoiceGender) {
    this.playSessionEndAlert(false);
    if (!voiceEnabled) return;
    const who = clientName ? ` pour ${clientName}` : '';
    this.speak(`Attention, il vous  reste  5 minutes sur ${stationName}${who}.`, {
      delayMs: 400,
      interrupt: false,
      gender,
    });
  },

  playSession1MinAlert(stationName: string, clientName?: string, voiceEnabled = true, gender?: VoiceGender) {
    this.playSessionEndAlert(true);
    if (!voiceEnabled) return;
    const who = clientName ? `, joueur ${clientName}` : '';
    this.speak(`Attention, dernière minute de jeu sur ${stationName}${who}.`, {
      delayMs: 450,
      interrupt: true,
      gender,
    });
  },

  playSessionEndSpokenAlert(stationName: string, clientName?: string, voiceEnabled = true, gender?: VoiceGender) {
    this.playSessionEndAlert(true);
    if (!voiceEnabled) return;
    const who = clientName ? ` pour ${clientName}` : '';
    this.speak(`Temps écoulé sur ${stationName}${who}. Fin de session et libération du poste.`, {
      delayMs: 450,
      interrupt: true,
      gender,
    });
  },

  playCashierWarningAlert(spokenText: string, voiceEnabled = true, gender?: VoiceGender) {
    this.playWarningBeep();
    if (!voiceEnabled) return;
    this.speak(spokenText, { delayMs: 320, interrupt: true, gender });
  },

  playTestVoiceAndSound(overrideGender?: VoiceGender): SpeechDiagnostic {
    this.ensureInitialized();
    const g = overrideGender || activeVoiceGender;
    if (overrideGender) {
      activeVoiceGender = overrideGender;
    }
    this.playQueueCallChime();
    const testPhrase =
      g === 'MALE'
        ? 'Bonjour ! Nous vous souhaitons les bienvenus dans la salle des jeux GOZA.'
        : 'Bonjour ! GOZA est la m;eilleur salle des jeux video de la ville Kinshasa avec plein des nouvautés.';
    this.speak(testPhrase, {
      delayMs: 550,
      interrupt: true,
      gender: g,
    });
    return this.getSpeechStatus();
  },

  playQueueCall() {
    this.playQueueCallChime();
  },

  playAlertWarning() {
    this.playWarningBeep();
  },
};
