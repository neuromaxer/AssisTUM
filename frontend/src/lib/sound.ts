let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, peak = 0.14) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t0);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(freq * 2.2, 2200), t0);
  filter.Q.setValueAtTime(0.4, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(filter).connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function playTodoDone() {
  tone(392, 0, 0.28, 0.12);
  tone(587, 0.11, 0.42, 0.1);
}
