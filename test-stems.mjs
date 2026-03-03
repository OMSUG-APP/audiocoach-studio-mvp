import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const BASE_URL = 'http://localhost:3000';

function analyseWav(filepath, label) {
  const buf = readFileSync(filepath);
  const riff = buf.slice(0, 4).toString('ascii');
  const wave = buf.slice(8, 12).toString('ascii');
  const sampleRate = buf.readUInt32LE(24);
  const numChannels = buf.readUInt16LE(22);
  const bitDepth = buf.readUInt16LE(34);
  const dataChunkSize = buf.readUInt32LE(40);
  const duration = (dataChunkSize / (sampleRate * numChannels * (bitDepth / 8))).toFixed(2);

  // DC offset — use middle of file to avoid transient bias (frame-based arithmetic)
  const totalFrames = dataChunkSize / (numChannels * 2);
  const midFrame = Math.floor(totalFrames / 2);
  let dcSum = 0;
  const dcN = Math.min(4000, totalFrames - midFrame);
  for (let i = 0; i < dcN; i++) {
    dcSum += buf.readInt16LE(44 + (midFrame + i) * numChannels * 2) / 32768;
  }
  const dc = Math.abs(dcSum / dcN);

  // RMS — skip first 1s (covers silent attack phases), measure next ~4.5s
  const skipSamples = Math.floor(sampleRate * 1.0);
  let rmsSum = 0;
  const rmsN = Math.min(200000, totalFrames - skipSamples);
  for (let i = 0; i < rmsN; i++) {
    const s = buf.readInt16LE(44 + (skipSamples + i) * numChannels * 2) / 32768;
    rmsSum += s * s;
  }
  const rms = Math.sqrt(rmsSum / rmsN);

  const errors = [];
  if (riff !== 'RIFF' || wave !== 'WAVE') errors.push('Bad WAV header');
  if (sampleRate !== 44100) errors.push(`Wrong sample rate: ${sampleRate}`);
  if (bitDepth !== 16) errors.push(`Wrong bit depth: ${bitDepth}`);
  if (numChannels !== 2) errors.push(`Wrong channels: ${numChannels}`);
  if (buf.length < 1000) errors.push('File too small');
  if (dc > 0.05) errors.push(`DC offset too high: ${dc.toFixed(4)}`);
  if (rms === 0) errors.push('Silent — no audio content rendered');

  const status = errors.length === 0 ? '✓' : '✗';
  console.log(`   ${status} ${label.padEnd(10)} | ${(buf.length/1024).toFixed(0).padStart(6)} KB | ~${duration}s | RMS ${rms.toFixed(4)} | DC ${dc.toFixed(6)}`);
  if (errors.length) errors.forEach(e => console.log(`       ✗ ${e}`));
  return errors;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(`PAGE ERROR: ${err.message}`));

  console.log('1. Loading app...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  console.log('   ✓ App loaded');

  console.log('2. Initialising AudioContext...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  console.log('   ✓ AudioContext ready');

  console.log('3. Generating patterns...');
  const genBtns = page.locator('button', { hasText: 'Generate' });
  const count = await genBtns.count();
  console.log(`   Found ${count} Generate button(s):`);

  // Log what each button belongs to by reading surrounding context
  for (let i = 0; i < count; i++) {
    const btn = genBtns.nth(i);
    await btn.scrollIntoViewIfNeeded();
    // Get the nearest section heading
    const label = await btn.evaluate(el => {
      let node = el.parentElement;
      for (let j = 0; j < 8; j++) {
        if (!node) break;
        const heading = node.querySelector('[class*="font-bold"]');
        if (heading && heading !== el) return heading.textContent?.trim().slice(0, 40);
        node = node.parentElement;
      }
      return '(unknown)';
    });
    console.log(`   [${i}] Generate — near: "${label}"`);
    await btn.click();
    await page.waitForTimeout(200);
  }

  // Wait long enough for localStorage debounce (1s) to flush
  await page.waitForTimeout(1500);

  // Debug: read synth steps from localStorage (should now be current state)
  const synthStepsDebug = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('sequencer-project');
      if (!raw) return 'no localStorage entry';
      const proj = JSON.parse(raw);
      const pattern = proj.patterns?.[0];
      if (!pattern) return 'no pattern';
      const synth = pattern.synth || [];
      const active = synth.filter(s => s.active);
      return `${synth.length} steps total, ${active.length} active — notes: [${active.map(s => s.note).join(', ')}]`;
    } catch (e) {
      return `error: ${e}`;
    }
  });
  console.log(`   Synth state: ${synthStepsDebug}`);
  console.log('   ✓ Patterns generated');

  console.log('4. Triggering Export Stems...');
  const downloads = [];
  page.on('download', d => downloads.push(d));

  await page.locator('button', { hasText: 'Export Stems' }).click();

  const deadline = Date.now() + 25000;
  while (downloads.length < 3 && Date.now() < deadline) {
    await page.waitForTimeout(500);
  }

  if (downloads.length === 0) {
    console.log('   ✗ No downloads received');
    await browser.close();
    process.exit(1);
  }
  console.log(`   ✓ Received ${downloads.length} download(s)\n`);

  console.log('   Stem        |    Size    | Duration |    RMS   |  DC Offset');
  console.log('   ' + '-'.repeat(62));

  const allErrors = [];
  for (const dl of downloads) {
    const path = await dl.path();
    const name = dl.suggestedFilename();
    const label = name.replace(/.*stem-/, '').replace('.wav', '');
    allErrors.push(...analyseWav(path, label));
  }

  const names = downloads.map(d => d.suggestedFilename());
  console.log('\n   Stems received:');
  ['drums', 'bass', 'synth'].forEach(stem => {
    const found = names.some(n => n.includes(stem));
    console.log(`   ${stem}: ${found ? '✓' : '✗ MISSING'}`);
    if (!found) allErrors.push(`${stem} stem missing`);
  });

  if (consoleErrors.length > 0) {
    console.log(`\n5. Console errors (${consoleErrors.length}):`);
    consoleErrors.forEach(e => console.log(`   - ${e}`));
  } else {
    console.log('\n5. No console errors ✓');
  }

  await browser.close();

  if (allErrors.length > 0) {
    console.log('\n❌ STEMS TEST FAILED');
    process.exit(1);
  }
  console.log('\n✅ STEMS TEST PASSED');
})();
