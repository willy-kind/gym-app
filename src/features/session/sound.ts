// The rest-over alarm, made with Web Audio so there's no sound file to load.
// iOS only lets a page play audio after a tap has "unlocked" it, and pauses it
// again when the phone locks or the app is hidden, so any tap re-unlocks it
// (installAudioUnlock). Nothing can play while the app is in the background.
//
// Music (e.g. Spotify) normally drowns the alarm out, because a web page's
// audio is mixed under other apps. Safari's Audio Session API (iOS 17+) can
// change that, but only takes effect when the audio engine starts. So each
// alarm stops the engine, sets the session type ("transient" lowers other
// audio, "playback" interrupts it), restarts, plays, and stops again, handing
// the audio back to the music afterwards.

export type MusicMode = 'duck' | 'pause'

let ctx: AudioContext | null = null
let playing = false

interface AudioSessionLike {
  type: string
}
const audioSession = (): AudioSessionLike | undefined => (navigator as Navigator & { audioSession?: AudioSessionLike }).audioSession

function setSessionType(type: string) {
  try {
    const s = audioSession()
    if (s && s.type !== type) s.type = type
  } catch {
    // Not supported or not allowed: plays mixed under other audio.
  }
}

export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state !== 'running' && !playing) void ctx.resume()
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

/** A soft, rising three-note bell (G5 C6 E6, a major chord), each note ringing out. */
const NOTES: readonly (readonly [number, number])[] = [
  [0.0, 783.99],
  [0.22, 1046.5],
  [0.44, 1318.51],
]
/** How long the last note rings, and so the whole alarm (s). */
const RING_S = 1.6
const ALARM_S = 0.44 + RING_S

function schedule(c: AudioContext) {
  // A compressor keeps the overlapping notes loud without distorting.
  const out = c.createDynamicsCompressor()
  out.threshold.value = -10
  out.ratio.value = 8
  const master = c.createGain()
  master.gain.value = 1
  out.connect(master).connect(c.destination)

  const t = c.currentTime + 0.03
  for (const [offset, freq] of NOTES) {
    const start = t + offset
    // Bell timbre: a fundamental plus a soft octave and a faint "shimmer" partial.
    for (const [ratio, level] of [
      [1, 0.9],
      [2, 0.25],
      [3.01, 0.08],
    ] as const) {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq * ratio
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(level, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + RING_S / ratio)
      osc.connect(gain).connect(out)
      osc.start(start)
      osc.stop(start + RING_S / ratio + 0.05)
    }
  }
}

/**
 * Plays the alarm. With music playing it either lowers it ("duck") or pauses it
 * ("pause") for the moment of the alarm, where Safari allows.
 */
export async function playRestDone(mode: MusicMode = 'duck'): Promise<void> {
  if (!ctx || playing) return
  const c = ctx
  playing = true
  try {
    // The session type only applies when the engine (re)starts.
    if (c.state === 'running') await c.suspend()
    setSessionType(mode === 'pause' ? 'playback' : 'transient')
    await c.resume()
    if (c.state !== 'running') return
    schedule(c)
    await new Promise((r) => setTimeout(r, (ALARM_S + 0.2) * 1000))
  } catch {
    // Couldn't start audio (e.g. not unlocked yet): the screen still shows "Go".
  } finally {
    // Hand the audio back: stop the engine so the music returns to full volume / can resume.
    try {
      if (c.state === 'running') await c.suspend()
    } catch {
      // ignore
    }
    setSessionType('auto')
    playing = false
  }
}
