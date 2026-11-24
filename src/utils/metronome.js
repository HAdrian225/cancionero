import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const clampBpm = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 100;
  return Math.max(40, Math.min(240, Math.round(n)));
};

const clampBeats = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 4;
  return Math.max(2, Math.min(8, Math.round(n)));
};

// Motor de metrónomo 100% offline:
// - En Web/PWA (iPhone Safari + Android Chrome): Web Audio API con lookahead de precisión (0 KB extra).
// - En Expo Go nativo: pulso visual + feedback háptico por tiempo.
export function createMetronomeEngine({ onBeat }) {
  let ctx = null;
  let timer = null;
  let running = false;
  let sessionId = 0;
  let beatTimeouts = new Set();
  let bpm = 100;
  let beats = 4;
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
    // En iOS Safari el estado puede ser 'suspended' o 'interrupted' tras bloqueo/llamadas.
    if (ctx.state !== 'running') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  };

  const scheduleClick = (audioCtx, time, isAccent) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isAccent ? 1120 : 780, time);
    osc.frequency.exponentialRampToValueAtTime(isAccent ? 560 : 420, time + 0.032);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(isAccent ? 0.55 : 0.34, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  };

  const webTick = () => {
    if (!running || !ctx) return;
    // Evita ráfaga acumulada si iOS pausó la pestaña en segundo plano.
    if (nextNoteTime < ctx.currentTime - 0.15) {
      nextNoteTime = ctx.currentTime + 0.04;
    }

    const lookaheadSec = 0.1;
    const activeSession = sessionId;
    let scheduled = 0;
    while (nextNoteTime < ctx.currentTime + lookaheadSec && scheduled < 4) {
      const beatIndex = currentBeat;
      const isAccent = beatIndex === 0;
      const fireAt = nextNoteTime;
      scheduleClick(ctx, fireAt, isAccent);

      const delayMs = Math.max(0, Math.round((fireAt - ctx.currentTime) * 1000));
      const tid = setTimeout(() => {
        beatTimeouts.delete(tid);
        if (running && sessionId === activeSession) onBeat(beatIndex);
      }, delayMs);
      beatTimeouts.add(tid);

      nextNoteTime += 60 / bpm;
      currentBeat = (currentBeat + 1) % beats;
      scheduled += 1;
    }
  };

  const nativeTick = () => {
    if (!running) return;
    const beatIndex = currentBeat;
    const isAccent = beatIndex === 0;
    onBeat(beatIndex);
    Haptics.impactAsync(
      isAccent ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    ).catch(() => {});
    currentBeat = (currentBeat + 1) % beats;
    timer = setTimeout(nativeTick, Math.round(60000 / bpm));
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

  return {
    start(nextBpm, nextBeats) {
      bpm = clampBpm(nextBpm);
      beats = clampBeats(nextBeats);
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
    update(nextBpm, nextBeats) {
      bpm = clampBpm(nextBpm);
      beats = clampBeats(nextBeats);
      if (currentBeat >= beats) currentBeat = 0;
    },
    dispose() {
      stopInternal(false);
      if (ctx && typeof ctx.close === 'function') {
        ctx.close().catch(() => {});
        ctx = null;
      }
    },
  };
}
