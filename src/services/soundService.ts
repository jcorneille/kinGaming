/**
 * Service de synthèse sonore & alertes parlantes humaines (Gemini TTS + HTMLAudio/WebAudio + Web Speech API).
 * Compatible tous navigateurs Windows & macOS (Chrome, Edge, Safari, Firefox, Brave, mobile).
 */

export type VoiceGender = 'FEMALE' | 'MALE';

interface CachedAudioEntry {
  bytes: Uint8Array;
  mimeType: string;
  audioBuffer?: AudioBuffer;
}

const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

let audioCtx: AudioContext | null = null;
let sharedTtsAudioEl: HTMLAudioElement | null = null;
let currentBlobUrl: string | null = null;
let audioUnlocked = false;
let htmlAudioUnlocked = false;
let speechUnlocked = false;
let cachedVoices: SpeechSynthesisVoice[] = [];
let listenersAttached = false;
let lastSpokenText = '';
let lastSpokenAt = 0;
let activeVoiceGender: VoiceGender = 'FEMALE';
let currentTtsSource: AudioBufferSourceNode | null = null;
let speakRequestSeq = 0;
let fallbackSpeakTimer: number | null = null;

const activeUtterances = new Set<SpeechSynthesisUtterance>();
const clientAudioCache = new Map<string, CachedAudioEntry>();

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

function getSharedAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
  if (!sharedTtsAudioEl) {
    const el = new Audio();
    el.preload = 'auto';
    el.setAttribute('playsinline', 'true');
    sharedTtsAudioEl = el;
  }
  return sharedTtsAudioEl;
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
  'chloe', 'chloé', 'marion', 'eloise', 'éloïse', 'vivienne', 'brigitte',
  'sylvie', 'nathalie', 'florence', 'sophie', 'female', 'femme',
];

const MALE_VOICE_HINTS = [
  'henri', 'paul', 'thomas', 'claude', 'nicolas', 'jerome', 'jérôme',
  'alain', 'antoine', 'remy', 'rémy', 'guillaume', 'sebastien', 'sébastien',
  'daniel', 'jacques', 'luc', 'male', 'homme',
];

const NATURAL_QUALITY_HINTS = [
  'natural', 'online', 'neural', 'siri', 'enhanced', 'premium', 'améliorée', 'google',
];

function scoreVoice(v: SpeechSynthesisVoice, gender: VoiceGender): { score: number; matchedGender: boolean } {
  const normLang = (v.lang || '').replace('_', '-').toLowerCase();
  const lowerName = (v.name || '').toLowerCase();
  const hints = gender === 'MALE' ? MALE_VOICE_HINTS : FEMALE_VOICE_HINTS;
  const oppositeHints = gender === 'MALE' ? FEMALE_VOICE_HINTS : MALE_VOICE_HINTS;

  let score = 0;
  if (normLang === 'fr-fr') score += 40;
  else if (normLang === 'fr-ca') score += 32;
  else if (normLang.startsWith('fr')) score += 25;
  else return { score: -100, matchedGender: false };

  const matchedGender = hints.some((h) => lowerName.includes(h));
  const matchedOpposite = oppositeHints.some((h) => lowerName.includes(h));

  if (matchedGender) score += 60;
  else if (matchedOpposite) score -= 20;

  if (NATURAL_QUALITY_HINTS.some((q) => lowerName.includes(q))) {
    score += 30;
  }
  if (!v.localService) {
    score += 8;
  }
  return { score, matchedGender };
}

function pickFrenchVoice(gender: VoiceGender): { voice: SpeechSynthesisVoice | null; matchedGender: boolean } {
  const voices = refreshVoices();
  if (voices.length === 0) return { voice: null, matchedGender: false };

  let bestVoice: SpeechSynthesisVoice | null = null;
  let bestScore = -999;
  let bestMatchedGender = false;

  for (const v of voices) {
    const { score, matchedGender } = scoreVoice(v, gender);
    if (score > bestScore) {
      bestScore = score;
      bestVoice = v;
      bestMatchedGender = matchedGender;
    }
  }

  if (bestVoice && bestScore > -50) {
    return { voice: bestVoice, matchedGender: bestMatchedGender };
  }
  return { voice: null, matchedGender: false };
}

function unlockAudioAndSpeech(forceSpeechPrime = false): void {
  if (typeof window === 'undefined') return;

  const ctx = getAudioContext();
  if (ctx) {
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => {
        audioUnlocked = true;
      }).catch(() => {});
    } else if (ctx.state === 'running') {
      audioUnlocked = true;
    }
    try {
      // Impulsion silencieuse 1 sample pour Safari macOS/iOS & Chrome
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      // Ignore
    }
  }

  const audioEl = getSharedAudioElement();
  if (audioEl && !htmlAudioUnlocked) {
    try {
      const prevSrc = audioEl.src;
      audioEl.muted = true;
      audioEl.src = SILENT_WAV_DATA_URI;
      const playPromise = audioEl.play();
      if (playPromise && typeof playPromise.then === 'function') {
        void playPromise
          .then(() => {
            audioEl.pause();
            audioEl.muted = false;
            if (prevSrc) audioEl.src = prevSrc;
            else audioEl.removeAttribute('src');
            htmlAudioUnlocked = true;
          })
          .catch(() => {
            audioEl.muted = false;
          });
      }
    } catch {
      // Ignore
    }
  }

  if ('speechSynthesis' in window && (!speechUnlocked || forceSpeechPrime)) {
    try {
      refreshVoices();
      if (!window.speechSynthesis.speaking) {
        const primer = new SpeechSynthesisUtterance(' ');
        primer.volume = 0;
        primer.rate = 2;
        primer.lang = 'fr-FR';
        window.speechSynthesis.speak(primer);
      }
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
    unlockAudioAndSpeech(false);
  };

  window.addEventListener('pointerdown', onUserGesture, { passive: true });
  window.addEventListener('click', onUserGesture, { passive: true });
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

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function ensureClientWavBytes(bytes: Uint8Array, mimeType: string): { bytes: Uint8Array; mimeType: string } {
  const lower = (mimeType || '').toLowerCase();
  const isRiff =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46;
  const isCompressed =
    bytes.length >= 4 &&
    ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
      (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67) ||
      (bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61) ||
      (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));

  if (isRiff || isCompressed || (!lower.includes('l16') && !lower.includes('pcm') && !lower.includes('raw') && lower !== 'audio/wav')) {
    return { bytes, mimeType: mimeType || 'audio/wav' };
  }

  const rateMatch = lower.match(/rate=(\d+)/);
  const sampleRate = rateMatch ? Math.max(8000, Math.min(96000, Number(rateMatch[1]))) : 24000;
  const dataSize = bytes.length;
  const wav = new Uint8Array(44 + dataSize);
  const view = new DataView(wav.buffer);

  wav.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  view.setUint32(4, 36 + dataSize, true);
  wav.set([0x57, 0x41, 0x56, 0x45], 8); // WAVE
  wav.set([0x66, 0x6d, 0x74, 0x20], 12); // fmt
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  wav.set([0x64, 0x61, 0x74, 0x61], 36); // data
  view.setUint32(40, dataSize, true);
  wav.set(bytes, 44);

  return { bytes: wav, mimeType: 'audio/wav' };
}

function stopCurrentTtsPlayback(): void {
  if (fallbackSpeakTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(fallbackSpeakTimer);
    fallbackSpeakTimer = null;
  }
  if (currentTtsSource) {
    try {
      currentTtsSource.stop();
    } catch {
      // Ignore
    }
    currentTtsSource = null;
  }
  if (sharedTtsAudioEl) {
    try {
      sharedTtsAudioEl.pause();
      sharedTtsAudioEl.currentTime = 0;
    } catch {
      // Ignore
    }
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      activeUtterances.clear();
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
    const wasBusy = synth.speaking || synth.pending;

    if (options?.interrupt !== false && wasBusy) {
      synth.cancel();
      activeUtterances.clear();
    }
    if (synth.paused) {
      synth.resume();
    }

    const runSpeak = () => {
      try {
        if (synth.paused) synth.resume();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'fr-FR';
        utterance.rate = options?.rate ?? 0.98;
        utterance.volume = options?.volume ?? 1.0;

        const { voice, matchedGender } = pickFrenchVoice(gender);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = (voice.lang || 'fr-FR').replace('_', '-');
          utterance.pitch = matchedGender ? 1.0 : gender === 'MALE' ? 0.86 : 1.06;
        } else {
          utterance.pitch = gender === 'MALE' ? 0.86 : 1.06;
        }

        activeUtterances.add(utterance);
        utterance.onend = () => {
          activeUtterances.delete(utterance);
        };
        utterance.onerror = () => {
          activeUtterances.delete(utterance);
        };

        synth.speak(utterance);
        speechUnlocked = true;
      } catch {
        // Ignore
      }
    };

    // Un court délai après synth.cancel() évite le drop silencieux sur Chrome Windows & Safari macOS
    if (options?.interrupt !== false && wasBusy) {
      if (fallbackSpeakTimer !== null) {
        window.clearTimeout(fallbackSpeakTimer);
      }
      fallbackSpeakTimer = window.setTimeout(() => {
        fallbackSpeakTimer = null;
        runSpeak();
      }, 45);
    } else {
      runSpeak();
    }
  } catch {
    // Ignore
  }
}

async function playViaHtmlAudioElement(
  bytes: Uint8Array,
  mimeType: string,
  volume: number
): Promise<boolean> {
  const el = getSharedAudioElement();
  if (!el) return false;

  try {
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }
    const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], {
      type: mimeType || 'audio/wav',
    });
    const url = URL.createObjectURL(blob);
    currentBlobUrl = url;
    el.muted = false;
    el.volume = Math.max(0, Math.min(1, volume));
    el.src = url;
    await el.play();
    htmlAudioUnlocked = true;
    return true;
  } catch {
    return false;
  }
}

async function speakViaHumanGeminiTTS(
  cleanText: string,
  gender: VoiceGender,
  reqId: number,
  options?: { interrupt?: boolean; rate?: number; volume?: number }
): Promise<boolean> {
  try {
    const cacheKey = `${gender}:${cleanText}`;
    let entry = clientAudioCache.get(cacheKey);

    if (!entry) {
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

      const rawBytes = base64ToUint8Array(data.audioBase64);
      const normalized = ensureClientWavBytes(rawBytes, data.mimeType || 'audio/wav');
      entry = {
        bytes: normalized.bytes,
        mimeType: normalized.mimeType,
      };

      if (clientAudioCache.size >= 60) {
        const oldestKey = clientAudioCache.keys().next().value;
        if (oldestKey) clientAudioCache.delete(oldestKey);
      }
      clientAudioCache.set(cacheKey, entry);
    }

    // Si une nouvelle annonce prioritaire est arrivée pendant le fetch, ne pas superposer
    if (reqId !== speakRequestSeq && options?.interrupt !== false) {
      return true;
    }

    if (options?.interrupt !== false) {
      stopCurrentTtsPlayback();
    }

    const volume = options?.volume ?? 1.0;

    // Voie 1 : Web Audio API (décodage ultra-rapide et sans coupure)
    const ctx = getAudioContext();
    if (ctx) {
      try {
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        if (ctx.state === 'running') {
          if (!entry.audioBuffer) {
            const copy = entry.bytes.buffer.slice(
              entry.bytes.byteOffset,
              entry.bytes.byteOffset + entry.bytes.byteLength
            ) as ArrayBuffer;
            entry.audioBuffer = await ctx.decodeAudioData(copy);
          }

          if (reqId !== speakRequestSeq && options?.interrupt !== false) {
            return true;
          }

          const source = ctx.createBufferSource();
          source.buffer = entry.audioBuffer;
          const gainNode = ctx.createGain();
          gainNode.gain.value = volume;
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
        }
      } catch {
        // Poursuite automatique vers Voie 2 (HTMLAudioElement)
      }
    }

    // Voie 2 : HTMLAudioElement natif (secours Safari macOS / Firefox / navigateurs restreints)
    return await playViaHtmlAudioElement(entry.bytes, entry.mimeType, volume);
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
    unlockAudioAndSpeech(true);
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
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
          typeof Audio !== 'undefined'
      );
    const voices = refreshVoices();
    const { voice } = pickFrenchVoice(activeVoiceGender);
    return {
      supported,
      audioSupported,
      unlocked: audioUnlocked || htmlAudioUnlocked || speechUnlocked,
      voiceCount: voices.length,
      frenchVoiceName: voice ? `${voice.name} (${voice.lang})` : null,
      voiceGender: activeVoiceGender,
    };
  },

  /**
   * Synthèse vocale humaine en français (Gemini TTS Voix Féminine/Masculine + Repli navigateur Windows/macOS)
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
        ? 'Bonjour ! Nous vous souhaitons la bienvenue dans la salle de jeux GOZA.'
        : 'Bonjour ! GOZA est la meilleure salle de jeux vidéo de la ville de Kinshasa avec plein de nouveautés.';
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
