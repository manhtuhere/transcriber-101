/**
 * A real, valid WAV buffer — generated rather than committed as a binary so the
 * duration and sample rate are visible and adjustable in the tests that use it.
 * This is what the mocked Deepgram endpoint returns.
 */
export function toneWav({
  seconds = 0.5,
  sampleRate = 24000,
  frequency = 440,
}: { seconds?: number; sampleRate?: number; frequency?: number } = {}): Uint8Array {
  const samples = Math.floor(seconds * sampleRate)
  const dataBytes = samples * 2
  const buffer = Buffer.alloc(44 + dataBytes)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataBytes, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // PCM header size
  buffer.writeUInt16LE(1, 20) // format: PCM
  buffer.writeUInt16LE(1, 22) // channels: mono
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28) // byte rate
  buffer.writeUInt16LE(2, 32) // block align
  buffer.writeUInt16LE(16, 34) // bits per sample
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataBytes, 40)

  for (let i = 0; i < samples; i += 1) {
    const value = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0x3fff
    buffer.writeInt16LE(Math.round(value), 44 + i * 2)
  }

  return new Uint8Array(buffer)
}
