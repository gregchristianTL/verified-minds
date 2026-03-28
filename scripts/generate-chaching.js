/**
 * Generates a satisfying "cha-ching" cash register sound as a WAV file.
 * Run: node scripts/generate-chaching.js
 */
const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 44100;
const DURATION = 0.55;
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * DURATION);
const samples = new Float32Array(NUM_SAMPLES);

for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  let s = 0;

  // Part 1: "cha" — short percussive metallic hit (0–45ms)
  if (t < 0.045) {
    const env = Math.exp(-t * 90);
    // Filtered noise for the mechanical clack
    s += env * 0.5 * (Math.sin(i * 0.8) * Math.cos(i * 1.3) * 2 - 0.5);
    // High metallic tone
    s += env * 0.35 * Math.sin(2 * Math.PI * 4200 * t);
    s += env * 0.2 * Math.sin(2 * Math.PI * 6300 * t);
  }

  // Part 2: "ching" — bright bell ring (90ms–550ms)
  if (t >= 0.09) {
    const t2 = t - 0.09;
    const env = Math.exp(-t2 * 5.5);
    // Major triad harmonics for a pleasing ring
    s += env * 0.28 * Math.sin(2 * Math.PI * 2093 * t2); // C7
    s += env * 0.22 * Math.sin(2 * Math.PI * 2637 * t2); // E7
    s += env * 0.14 * Math.sin(2 * Math.PI * 3136 * t2); // G7
    // Shimmer overtones
    s += env * 0.08 * Math.sin(2 * Math.PI * 4186 * t2); // C8
    s += env * 0.05 * Math.sin(2 * Math.PI * 5274 * t2); // E8
  }

  samples[i] = Math.max(-1, Math.min(1, s));
}

// Pack into 16-bit PCM WAV
const dataSize = NUM_SAMPLES * 2;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);  // PCM
buffer.writeUInt16LE(1, 22);  // mono
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

for (let i = 0; i < NUM_SAMPLES; i++) {
  const clamped = Math.max(-1, Math.min(1, samples[i]));
  buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
}

const outPath = path.join(__dirname, "..", "public", "sounds", "chaching.wav");
fs.writeFileSync(outPath, buffer);
console.log(`Generated ${outPath} (${buffer.length} bytes)`);
