// The rest-over alarm, made with Web Audio so there's no sound file to load.
// iOS only lets a page play audio after a tap has "unlocked" it, and pauses it
// again when the phone locks or the app is hidden, so any tap re-unlocks it
// (installAudioUnlock). Nothing can play while the app is in the background.
//
// A web page's audio is mixed with other apps' (e.g. Spotify). Each alarm
// stops the audio engine, asks for Safari's "transient" (alert) audio session,
// restarts, plays, and stops again, handing the audio back to the music. In
// testing this made the alarm easier to hear over music, though iOS didn't
// lower the music. ("playback", which pauses the music, was tried and dropped:
// Spotify didn't resume afterwards.)

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

/**
 * An upbeat "ta-ta-ta-TAAA" fanfare (C6 E6 G6, then a held C7), played twice:
 * short punchy notes with a held top note, about 1.5 s in all.
 */
const MOTIF: readonly (readonly [number, number, number])[] = [
  // [start s, frequency Hz, length s]
  [0.0, 1046.5, 0.09],
  [0.11, 1318.51, 0.09],
  [0.22, 1567.98, 0.09],
  [0.33, 2093.0, 0.32],
]
const REPEAT_AT_S = 0.78
const ALARM_S = REPEAT_AT_S + 0.33 + 0.32
/** Overall level: loud enough to cut through, a notch below full. */
const VOLUME = 0.7

function schedule(c: AudioContext) {
  const out = c.createDynamicsCompressor()
  out.threshold.value = -12
  out.ratio.value = 6
  const master = c.createGain()
  master.gain.value = VOLUME
  out.connect(master).connect(c.destination)

  const t0 = c.currentTime + 0.03
  for (const repeat of [0, REPEAT_AT_S]) {
    for (const [offset, freq, length] of MOTIF) {
      const start = t0 + repeat + offset
      // Bright but round: a triangle body with a soft sine octave on top.
      for (const [type, ratio, level] of [
        ['triangle', 1, 0.8],
        ['sine', 2, 0.25],
      ] as const) {
        const osc = c.createOscillator()
        const gain = c.createGain()
        osc.type = type
        osc.frequency.value = freq * ratio
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(level, start + 0.008)
        gain.gain.setValueAtTime(level, start + length * 0.6)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
        osc.connect(gain).connect(out)
        osc.start(start)
        osc.stop(start + length + 0.02)
      }
    }
  }
}

/** Plays the rest-over alarm. */
export async function playRestDone(): Promise<void> {
  if (!ctx || playing) return
  const c = ctx
  playing = true
  try {
    // The session type only applies when the engine (re)starts.
    if (c.state === 'running') await c.suspend()
    setSessionType('transient')
    await c.resume()
    if (c.state !== 'running') return
    schedule(c)
    await new Promise((r) => setTimeout(r, (ALARM_S + 0.2) * 1000))
  } catch {
    // Couldn't start audio (e.g. not unlocked yet): the screen still shows "Go".
  } finally {
    // Hand the audio back to the music.
    try {
      if (c.state === 'running') await c.suspend()
    } catch {
      // ignore
    }
    setSessionType('auto')
    playing = false
  }
}
