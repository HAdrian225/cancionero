import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const BEAT_MUTE = 0;
export const BEAT_NORMAL = 1; // Negra / pulso normal
export const BEAT_ACCENT = 2; // Pulso fuerte / acento
export const BEAT_CLAP = 3;   // Palma

export const MIN_BPM = 40;
export const MAX_BPM = 240;
export const MIN_BEATS = 1;
export const MAX_BEATS = 16;
export const MIN_UNIT = 1;
export const MAX_UNIT = 16;

export const clampBpm = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 100;
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(n)));
};

export const clampBeats = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 4;
  return Math.max(MIN_BEATS, Math.min(MAX_BEATS, Math.round(n)));
};

export const clampBeatUnit = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 4;
  return Math.max(MIN_UNIT, Math.min(MAX_UNIT, Math.round(n)));
};

export const defaultPattern = (beats) =>
  Array.from({ length: clampBeats(beats) }, (_, i) => (i === 0 ? BEAT_ACCENT : BEAT_NORMAL));

export const normalizePattern = (pattern, beats) => {
  const count = clampBeats(beats);
  const base = Array.isArray(pattern) ? pattern : [];
  return Array.from({ length: count }, (_, i) => {
    const v = base[i];
    if (v === BEAT_MUTE || v === BEAT_NORMAL || v === BEAT_ACCENT || v === BEAT_CLAP) return v;
    return i === 0 ? BEAT_ACCENT : BEAT_NORMAL;
  });
};

// Ciclo ergonómico al tocar un tiempo: Negra -> Palma -> Fuerte -> Silencio -> Negra.
export const nextBeatType = (current) => {
  if (current === BEAT_NORMAL) return BEAT_CLAP;
  if (current === BEAT_CLAP) return BEAT_ACCENT;
  if (current === BEAT_ACCENT) return BEAT_MUTE;
  return BEAT_NORMAL;
};

// Motor de metrónomo 100% offline con compás custom (ej. 2/5, 7/8) y sonidos por tiempo
// (fuerte, negra, palma sintetizada, silencio).
export function createMetronomeEngine({ onBeat }) {
  let ctx = null;
  let noiseBuffer = null;
  let timer = null;
  let running = false;
  let sessionId = 0;
  let beatTimeouts = new Set();

  let bpm = 100;
  let beats = 4;
  let beatUnit = 4;
  let pattern = defaultPattern(4);
  let currentBeat = 0;
  let nextNoteTime = 0;

  const clearPendingBeatTimeouts = () => {
    for (const id of beatTimeouts) clearTimeout(id);
    beatTimeouts.clear();
  };

  const ensureAudioContext = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state !== 'running') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  };

  const getNoiseBuffer = (audioCtx) => {
    if (noiseBuffer && noiseBuffer.sampleRate === audioCtx.sampleRate) return noiseBuffer;
    const length = Math.floor(audioCtx.sampleRate * 0.14);
    const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffer = buffer;
    return buffer;
  };

  const scheduleClick = (audioCtx, time, isAccent) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isAccent ? 1140 : 780, time);
    osc.frequency.exponentialRampToValueAtTime(isAccent ? 560 : 420, time + 0.032);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(isAccent ? 0.58 : 0.36, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  };

  const scheduleClap = (audioCtx, time) => {
    const buffer = getNoiseBuffer(audioCtx);
    // Micro-doble golpe (0 ms y 11 ms) con filtro paso-banda imita una palma natural.
    for (const offset of [0, 0.011]) {
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1250, time + offset);
      filter.Q.setValueAtTime(1.4, time + offset);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.001, time + offset);
      gain.gain.linearRampToValueAtTime(offset === 0 ? 0.5 : 0.65, time + offset + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, time + offset + (offset === 0 ? 0.03 : 0.11));

      src.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      src.start(time + offset);
      src.stop(time + offset + 0.13);
    }
  };

  const getStepSeconds = () => (60 / bpm) * (4 / beatUnit);

  const webTick = () => {
    if (!running || !ctx) return;
    if (nextNoteTime < ctx.currentTime - 0.15) {
      nextNoteTime = ctx.currentTime + 0.04;
    }

    const lookaheadSec = 0.1;
    const activeSession = sessionId;
    let scheduled = 0;

    while (nextNoteTime < ctx.currentTime + lookaheadSec && scheduled < 6) {
      const beatIndex = currentBeat;
      const type = pattern[beatIndex] ?? BEAT_NORMAL;
      const fireAt = nextNoteTime;

      if (type === BEAT_ACCENT) scheduleClick(ctx, fireAt, true);
      else if (type === BEAT_NORMAL) scheduleClick(ctx, fireAt, false);
      else if (type === BEAT_CLAP) scheduleClap(ctx, fireAt);

      const delayMs = Math.max(0, Math.round((fireAt - ctx.currentTime) * 1000));
      const tid = setTimeout(() => {
        beatTimeouts.delete(tid);
        if (running && sessionId === activeSession) onBeat(beatIndex);
      }, delayMs);
      beatTimeouts.add(tid);

      nextNoteTime += getStepSeconds();
      currentBeat = (currentBeat + 1) % beats;
      scheduled += 1;
    }
  };

  const nativeTick = () => {
    if (!running) return;
    const beatIndex = currentBeat;
    const type = pattern[beatIndex] ?? BEAT_NORMAL;
    onBeat(beatIndex);

    if (type === BEAT_ACCENT) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    } else if (type === BEAT_CLAP) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else if (type === BEAT_NORMAL) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    currentBeat = (currentBeat + 1) % beats;
    timer = setTimeout(nativeTick, Math.max(60, Math.round(getStepSeconds() * 1000)));
  };

  const stopInternal = (notify = true) => {
    running = false;
    sessionId += 1;
    if (timer) {
      clearInterval(timer);
      clearTimeout(timer);
      timer = null;
    }
    clearPendingBeatTimeouts();
    if (notify) onBeat(-1);
  };

  const applyConfig = (cfg) => {
    bpm = clampBpm(cfg.bpm);
    beats = clampBeats(cfg.beats);
    beatUnit = clampBeatUnit(cfg.beatUnit);
    pattern = normalizePattern(cfg.pattern, beats);
    if (currentBeat >= beats) currentBeat = 0;
  };

  return {
    start(cfg) {
      applyConfig(cfg);
      stopInternal(false);
      running = true;
      currentBeat = 0;

      const audioCtx = ensureAudioContext();
      if (audioCtx) {
        nextNoteTime = audioCtx.currentTime + 0.04;
        webTick();
        timer = setInterval(webTick, 25);
      } else {
        nativeTick();
      }
    },
    stop() {
      stopInternal(true);
    },
    update(cfg) {
      applyConfig(cfg);
    },
    dispose() {
      stopInternal(false);
      noiseBuffer = null;
      if (ctx && typeof ctx.close === 'function') {
        ctx.close().catch(() => {});
        ctx = null;
      }
    },
  };
}
