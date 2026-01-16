/**
 * Download free sound effects for the games
 * Uses sounds from Mixkit and other free sources
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOUNDS_DIR = path.join(__dirname, '..', 'public', 'sounds');

// Free sound effect URLs from Mixkit (all CC0 / free to use)
const SOUND_SOURCES = {
  // UI Sounds
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  select: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  hover: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3',

  // Success/Error
  success: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  error: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',

  // Fun sounds
  pop: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
  whoosh: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
  ding: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',

  // Game sounds
  coin: 'https://assets.mixkit.co/active_storage/sfx/888/888-preview.mp3',
  levelup: 'https://assets.mixkit.co/active_storage/sfx/1997/1997-preview.mp3',
  powerup: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  bounce: 'https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3',

  // Pokemon specific
  catch: 'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3',
  release: 'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3',

  // Win/Lose
  win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  lose: 'https://assets.mixkit.co/active_storage/sfx/2575/2575-preview.mp3',

  // Other
  countdown: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  card_flip: 'https://assets.mixkit.co/active_storage/sfx/2576/2576-preview.mp3',
  match: 'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3',
  combo: 'https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3',
  streak: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3',
};

async function downloadSound(name, url) {
  const filepath = path.join(SOUNDS_DIR, `${name}.mp3`);

  if (fs.existsSync(filepath)) {
    const stats = fs.statSync(filepath);
    if (stats.size > 1000) { // Only skip if file is substantial
      console.log(`✓ ${name}.mp3 already exists`);
      return true;
    }
  }

  try {
    console.log(`Downloading ${name}...`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'audio/mpeg, audio/*',
      }
    });

    if (!response.ok) {
      console.log(`✗ Failed to download ${name}: ${response.status}`);
      return false;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 100) {
      console.log(`✗ Downloaded file too small for ${name}`);
      return false;
    }

    fs.writeFileSync(filepath, Buffer.from(buffer));
    console.log(`✓ Downloaded ${name}.mp3 (${Math.round(buffer.byteLength / 1024)}KB)`);
    return true;
  } catch (error) {
    console.log(`✗ Error downloading ${name}: ${error.message}`);
    return false;
  }
}

/**
 * Create a simple WAV beep sound as fallback
 */
function createBeepSound(frequency = 440, duration = 0.2, sampleRate = 44100) {
  const numSamples = Math.floor(sampleRate * duration);
  const dataSize = numSamples * 2; // 16-bit mono
  const fileSize = 44 + dataSize;

  const buffer = Buffer.alloc(fileSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // chunk size
  buffer.writeUInt16LE(1, offset); offset += 2; // PCM
  buffer.writeUInt16LE(1, offset); offset += 2; // mono
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(sampleRate * 2, offset); offset += 4; // byte rate
  buffer.writeUInt16LE(2, offset); offset += 2; // block align
  buffer.writeUInt16LE(16, offset); offset += 2; // bits per sample

  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Generate sine wave with fade
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const fadeIn = Math.min(1, i / (sampleRate * 0.01));
    const fadeOut = Math.min(1, (numSamples - i) / (sampleRate * 0.02));
    const envelope = fadeIn * fadeOut;
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
    buffer.writeInt16LE(Math.floor(sample * 32767), offset);
    offset += 2;
  }

  return buffer;
}

const FALLBACK_SOUNDS = {
  click: { freq: 1000, dur: 0.05 },
  select: { freq: 800, dur: 0.08 },
  hover: { freq: 600, dur: 0.03 },
  success: { freq: 880, dur: 0.3 },
  error: { freq: 200, dur: 0.2 },
  pop: { freq: 1200, dur: 0.05 },
  whoosh: { freq: 400, dur: 0.15 },
  ding: { freq: 1500, dur: 0.2 },
  coin: { freq: 1400, dur: 0.1 },
  levelup: { freq: 700, dur: 0.4 },
  powerup: { freq: 900, dur: 0.3 },
  bounce: { freq: 500, dur: 0.08 },
  catch: { freq: 1100, dur: 0.15 },
  release: { freq: 600, dur: 0.2 },
  win: { freq: 800, dur: 0.5 },
  lose: { freq: 300, dur: 0.4 },
  countdown: { freq: 1000, dur: 0.15 },
  card_flip: { freq: 700, dur: 0.06 },
  match: { freq: 1200, dur: 0.12 },
  combo: { freq: 1000, dur: 0.25 },
  streak: { freq: 1100, dur: 0.35 },
};

async function main() {
  console.log('Downloading sound effects...\n');

  // Ensure directory exists
  if (!fs.existsSync(SOUNDS_DIR)) {
    fs.mkdirSync(SOUNDS_DIR, { recursive: true });
  }

  let downloaded = 0;
  let failed = 0;
  let fallbacks = 0;

  for (const [name, url] of Object.entries(SOUND_SOURCES)) {
    const success = await downloadSound(name, url);
    if (success) {
      downloaded++;
    } else {
      // Create fallback beep sound
      const fallback = FALLBACK_SOUNDS[name];
      if (fallback) {
        const filepath = path.join(SOUNDS_DIR, `${name}.wav`);
        const wavBuffer = createBeepSound(fallback.freq, fallback.dur);
        fs.writeFileSync(filepath, wavBuffer);
        console.log(`  → Created fallback beep for ${name}`);
        fallbacks++;
      } else {
        failed++;
      }
    }
  }

  console.log(`\n✓ Downloaded: ${downloaded}`);
  if (fallbacks > 0) console.log(`⚡ Fallbacks: ${fallbacks}`);
  if (failed > 0) console.log(`✗ Failed: ${failed}`);
  console.log('\nSound effects ready in public/sounds/');
}

main();
