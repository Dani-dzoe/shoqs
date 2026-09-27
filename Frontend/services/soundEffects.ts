/**
 * Hospital Airport-Style Double/Triple Chime using the Web Audio API
 * Zero external audio files required. 100% self-contained.
 */

let audioCtx: AudioContext | null = null;
let soundMuted = false;

export function isSoundMuted(): boolean {
  return soundMuted;
}

export function setSoundMuted(muted: boolean): void {
  soundMuted = muted;
}

export function toggleSound(): boolean {
  soundMuted = !soundMuted;
  if (!soundMuted) {
    playHospitalChime();
  }
  return soundMuted;
}

export function playHospitalChime(): void {
  if (soundMuted) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Harmonic Chord 1: High Bell (F5 - 698.46 Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(698.46, now);
    gain1.gain.setValueAtTime(0.28, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.85);

    // Harmonic Chord 2: Pure Bright Bell (C6 - 1046.50 Hz)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1046.50, now + 0.22);
    gain2.gain.setValueAtTime(0.22, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.22);
    osc2.stop(now + 1.15);

    // Harmonic Chord 3: Deep Resonant Bell (A4 - 440 Hz)
    const osc3 = audioCtx.createOscillator();
    const gain3 = audioCtx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(440.0, now + 0.44);
    gain3.gain.setValueAtTime(0.25, now + 0.44);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.7);
    osc3.connect(gain3);
    gain3.connect(audioCtx.destination);
    osc3.start(now + 0.44);
    osc3.stop(now + 1.7);

  } catch (err) {
    console.warn('Web Audio chime initialization notice:', err);
  }
}

export function playEmergencyAlertSound(): void {
  if (soundMuted) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.6);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.7);
  } catch (e) {
    console.warn('Emergency alert sound notice:', e);
  }
}

export function speakAnnouncement(text: string): void {
  if (soundMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis notice:', e);
  }
}
