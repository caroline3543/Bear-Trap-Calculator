import React, { useRef, useState } from 'react';
import { loadTesseract } from './ocr-runtime.js';
import { BONUS_FIELDS, parseBonusScan, mergeBonusScans } from './bonus-scan.js';
// Remove colored marker backgrounds while retaining the game's dark text.
// Keep the original pass too: highlighted screenshots can hide a digit.
async function contrastCanvas(file, threshold) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close();
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const dark = pixels.data[i] < threshold && pixels.data[i + 1] < threshold && pixels.data[i + 2] < threshold + 55;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = dark ? 0 : 255;
  }
  ctx.putImageData(pixels, 0, 0); return canvas;
}
export default function BonusScanner({ onApply }) {
  const [files, setFiles] = useState([]);
  const [readings, setReadings] = useState({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const generation = useRef(0);
  const fields = BONUS_FIELDS.filter(f => readings[f.key]);
  const uncertain = fields.some(f => readings[f.key].uncertain);
  async function scan() {
    if (busy || !files.length) return;
    const revision = ++generation.current;
    setBusy(true); setError('');
    let merged = { ...readings };
    let failed = 0;
    try {
      const engine = await loadTesseract();
      for (let i = 0; i < files.length; i++) {
        setStatus(`Reading bonus screenshot ${i + 1} of ${files.length}…`);
        try {
          const result = await engine.recognize(files[i], 'eng', {
            workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
            corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5',
          });
          merged = mergeBonusScans(merged, parseBonusScan(result.data));
          // Two contrast passes cross-check digits obscured by colored highlights.
          if (typeof createImageBitmap === 'function') for (const threshold of [155, 170]) {
            const enhanced = await engine.recognize(await contrastCanvas(files[i], threshold), 'eng', {
              workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
              corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5',
            });
            merged = mergeBonusScans(merged, parseBonusScan({ ...enhanced.data, text: result.data.text + '\n' + enhanced.data.text }));
          }
        } catch { failed++; }
      }
      if (generation.current !== revision) return;
      setReadings(merged);
      setStatus(Object.keys(merged).length ? 'Review detected account bonuses' : 'No account bonuses found.');
      if (failed || !Object.keys(merged).length) setError(failed ? `${failed} screenshot(s) could not be read. Your successful readings are kept.` : 'Use English Bonus Overview screenshots with the labels and percentages visible. You can also enter the bonuses below.');
    } catch { setError('Could not load the scanner. Check your connection or enter the bonuses below.'); }
    finally { setBusy(false); }
  }
  function confirm(key, value, text) {
    setReadings(p => ({ ...p, [key]: { value, text, confidence: 100, uncertain: false, alternatives: [] } }));
  }
  return <section className="bl-bonus-scanner" aria-label="Account bonus scanner">
    <label className="bl-launch" style={{ cursor: busy ? 'wait' : 'pointer' }}>
      <span>Scan account bonus screenshots</span>
      <input type="file" accept="image/*" multiple disabled={busy} aria-label="Choose account bonus screenshots"
        onChange={e => {
          const images = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
          setFiles(p => [...p, ...images]); setError(images.length ? '' : 'Choose image files.'); e.target.value = '';
        }} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
    </label>
    <p className="bl-help">Choose one or more screenshots from Power → Bonus Overview. Scroll the game’s list and capture the rest. Missing fields keep your saved values. Scanning currently reads English bonus labels. For best results, use screenshots without marker highlights.</p>
    {files.length > 0 && <><ul className="bl-scan-files">{files.map((file, i) => <li key={`${file.name}:${i}`}>{file.name} <button type="button" disabled={busy} aria-label={`Remove screenshot ${i + 1}`} onClick={() => setFiles(p => p.filter((_, n) => n !== i))}>Remove</button></li>)}</ul><button type="button" className="bl-apply" disabled={busy} onClick={scan}>{busy ? status : `Read ${files.length} screenshot${files.length === 1 ? '' : 's'}`}</button></>}
    {status && <p className="bl-status" role="status">{status}</p>}
    {error && <p className="bl-error" role="alert">{error}</p>}
    {fields.length > 0 && <>
      <p className="bl-help">Only uncertain or conflicting readings are highlighted. Confirm those before applying.</p>
      <div className="bl-grid two">{fields.map(field => {
        const reading = readings[field.key];
        return <div key={field.key} className={reading.uncertain ? 'bl-scan-uncertain' : undefined}>
          <label className="bl-field"><span>{field.label}</span><input type="text" inputMode="decimal" className="calc-input" aria-label={`Scanned ${field.label}`} value={reading.text ?? reading.value}
            disabled={busy} onChange={e => {
              const raw = e.target.value.replace(/[%\s,]/g, '');
              const n = Number(raw);
              if (raw !== '' && Number.isFinite(n) && n >= 0 && n <= 10000) confirm(field.key, n, e.target.value);
              else setReadings(p => ({ ...p, [field.key]: { ...p[field.key], value: e.target.value, text: e.target.value, uncertain: true } }));
            }} /></label>
          {reading.uncertain && <><small className="bl-error">Check this reading{reading.alternatives.length ? `; also read ${reading.alternatives.join(', ')}` : ''}.</small><button type="button" disabled={busy || !Number.isFinite(reading.value)} onClick={() => confirm(field.key, reading.value)}>Confirm reading</button>{reading.alternatives.map(value => <button type="button" key={value} disabled={busy} onClick={() => confirm(field.key, value)}>Use {value}%</button>)}</>}
        </div>;
      })}</div>
      <button type="button" className="bl-apply" disabled={busy || uncertain} onClick={() => { onApply(readings); setReadings({}); setFiles([]); setStatus('Account bonuses updated.'); }}>Use reviewed bonuses</button>
    </>}
  </section>;
}
