// Writes assets/sounds/session-end.wav: the three soft tones the web plays
// at the end of a meditation or prayer session (C5, E5, G5), as a small
// mono WAV. Run with `node scripts/end-sound.mjs` after changing it.
import { Buffer } from "node:buffer"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const rate = 16000
const seconds = 3.6
const tones = [
  { at: 0, frequency: 523.25 },
  { at: 0.9, frequency: 659.25 },
  { at: 1.8, frequency: 783.99 },
]

const samples = new Int16Array(Math.round(rate * seconds))
for (const { at, frequency } of tones) {
  for (let index = 0; index < rate * 1.7; index++) {
    const time = index / rate
    // Quick rise, slow exponential fall (as the web's gain ramps).
    const gain =
      time < 0.05 ? (0.25 * time) / 0.05 : 0.25 * Math.exp(-(time - 0.05) * 4)
    const position = Math.round((at + time) * rate)
    if (position >= samples.length) break
    const value =
      samples[position] +
      gain * Math.sin(2 * Math.PI * frequency * time) * 32767
    samples[position] = Math.max(-32768, Math.min(32767, Math.round(value)))
  }
}

const header = Buffer.alloc(44)
header.write("RIFF", 0)
header.writeUInt32LE(36 + samples.byteLength, 4)
header.write("WAVE", 8)
header.write("fmt ", 12)
header.writeUInt32LE(16, 16)
header.writeUInt16LE(1, 20) // PCM
header.writeUInt16LE(1, 22) // mono
header.writeUInt32LE(rate, 24)
header.writeUInt32LE(rate * 2, 28)
header.writeUInt16LE(2, 32)
header.writeUInt16LE(16, 34)
header.write("data", 36)
header.writeUInt32LE(samples.byteLength, 40)

const file = join(
  dirname(fileURLToPath(import.meta.url)),
  "../assets/sounds/session-end.wav"
)
mkdirSync(dirname(file), { recursive: true })
writeFileSync(file, Buffer.concat([header, Buffer.from(samples.buffer)]))
console.log(`Wrote ${file}`)
