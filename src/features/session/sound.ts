// A short two-tone beep made with Web Audio, so there's no sound file to load.
// iOS only allows audio after a tap has "unlocked" it, so unlockAudio() is
// called from the Log set tap. The ring/silent switch can still mute it, and
// nothing plays while the app is in the background.

let ctx: AudioContext | null = null

export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null // no Web Audio: stay silent
  }
}

export function playRestDone(): void {
  if (!ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  for (const [offset, freq] of [
    [0, 880],
    [0.18, 1175],
  ] as const) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t + offset)
    gain.gain.exponentialRampToValueAtTime(0.25, t + offset + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.15)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t + offset)
    osc.stop(t + offset + 0.16)
  }
}
