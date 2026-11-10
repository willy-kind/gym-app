// The rest-over alarm, made with Web Audio so there's no sound file to load.
// iOS only lets a page play audio after a tap has "unlocked" it, and pauses it
// again when the phone locks or the app is hidden, so any tap re-unlocks it
// (installAudioUnlock) and playing tries to resume first. Nothing can play while
// the app is in the background.

let ctx: AudioContext | null = null

/**
 * Safari's Audio Session API (iOS 17+). "transient" is meant for short alerts:
 * other audio (e.g. Spotify) is lowered while it plays instead of drowning it out.
 */
interface AudioSessionLike {
  type: string
}
const audioSession = (): AudioSessionLike | undefined => (navigator as Navigator & { audioSession?: AudioSessionLike }).audioSession

export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state !== 'running') void ctx.resume()
  } catch {
    ctx = null // no Web Audio: stay silent
  }
}

/** Re-unlocks audio on every tap while `wanted()` (the sound setting) is on. */
export function installAudioUnlock(wanted: () => boolean): void {
  document.addEventListener('pointerdown', () => {
    if (wanted()) unlockAudio()
  })
}

/** Three rising chimes (~2 s), square-ish tones in the range phone speakers play loudest. */
const NOTES: readonly (readonly [number, number])[] = [
  [0.0, 1319], // E6
  [0.12, 1760], // A6
  [0.6, 1319],
  [0.72, 1760],
  [1.2, 1319],
  [1.32, 1760],
  [1.44, 2093], // C7
]
const NOTE_S = 0.11
const ALARM_S = 1.6

function schedule(c: AudioContext) {
  // A compressor lets the tones run hot (loud) without crackling.
  const out = c.createDynamicsCompressor()
  out.threshold.value = -6
  out.ratio.value = 12
  const master = c.createGain()
  master.gain.value = 1
  out.connect(master).connect(c.destination)

  const t = c.currentTime + 0.02
  for (const [offset, freq] of NOTES) {
    const start = t + offset
    for (const [type, level] of [
      ['square', 0.5],
      ['triangle', 0.6],
    ] as const) {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = type
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(level, start + 0.008)
      gain.gain.setValueAtTime(level, start + NOTE_S - 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + NOTE_S)
      osc.connect(gain).connect(out)
      osc.start(start)
      osc.stop(start + NOTE_S + 0.01)
    }
  }
}

/** Plays the alarm, briefly lowering other audio (music) where Safari allows it. */
export async function playRestDone(): Promise<void> {
  if (!ctx) return
  try {
    if (ctx.state !== 'running') await ctx.resume()
  } catch {
    return
  }
  if (ctx.state !== 'running') return

  const session = audioSession()
  const previous = session?.type
  try {
    if (session) session.type = 'transient'
  } catch {
    // Not allowed: play without ducking.
  }
  schedule(ctx)
  if (session) {
    setTimeout(() => {
      try {
        session.type = previous ?? 'auto'
      } catch {
        // ignore
      }
    }, (ALARM_S + 0.4) * 1000)
  }
}
