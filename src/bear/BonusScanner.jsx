import React, { useEffect, useRef, useState } from 'react';
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
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [zoom, setZoom] = useState(false);
  const [readings, setReadings] = useState({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  const fields = BONUS_FIELDS.filter(f => readings[f.key]);
  const uncertain = fields.some(f => readings[f.key].uncertain);
  async function scan(selected = file) {
    if (busy || !selected) return;
    const revision = ++generation.current;
    setBusy(true); setError(''); setReadings({}); setStatus('Reading screenshot…');
    let merged = {};
    try {
      const engine = await loadTesseract();
      const options = { workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js', corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5' };
      // Read the file itself, never the visible part of the preview.
      const result = await engine.recognize(selected, 'eng', options);
      merged = parseBonusScan(result.data);
      if (typeof createImageBitmap === 'function') for (const threshold of [155, 170]) {
        const enhanced = await engine.recognize(await contrastCanvas(selected, threshold), 'eng', options);
        merged = mergeBonusScans(merged, parseBonusScan({ ...enhanced.data, text: result.data.text + '\n' + enhanced.data.text }));
      }
      if (generation.current !== revision) return;
      setReadings(merged);
      setStatus(Object.keys(merged).length ? 'Review bonuses' : 'No bonuses found.');
      if (!Object.keys(merged).length) setError('Use an English Bonus Overview screenshot, or enter the values below.');
    } catch {
      if (generation.current === revision) {
        setReadings(merged); setStatus(Object.keys(merged).length ? 'Review bonuses' : '');
        setError('Some readings failed. Check the preview or enter the values below.');
      }
    } finally { if (generation.current === revision) setBusy(false); }
  }
  function choose(selected) {
    if (!selected?.type.startsWith('image/')) { setError('Choose an image.'); return; }
    setFile(selected); setPreview(''); setZoom(false);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.onerror = () => setError('The preview could not load. Try another image.');
    reader.readAsDataURL(selected);
    scan(selected);
  }
  function confirm(key, value, text) {
    setReadings(p => ({ ...p, [key]: { value, text, confidence: 100, uncertain: false, alternatives: [] } }));
  }
  return <section className="bl-bonus-scanner" aria-label="Account bonus scanner">
    <label className="bl-launch bl-upload">
      <span>{file ? 'Replace screenshot' : 'Scan bonus screenshot'}</span>
      <input type="file" accept="image/*" disabled={busy} aria-label="Choose account bonus screenshot"
        onChange={e => { if (e.target.files?.[0]) choose(e.target.files[0]); e.target.value = ''; }} />
    </label>
    {!file && <p className="bl-help">Power → Bonus Overview. Choose one screenshot.</p>}
    {preview && <div className="bl-preview-sticky">
      <div className="bl-screenshot-preview" aria-label="Bonus screenshot preview">
        <img src={preview} alt="Your account bonus screenshot" style={{ width: zoom ? '200%' : '100%', maxWidth: 'none' }} />
      </div>
      <div className="bl-preview-tools"><span>Reads the whole image.</span><button type="button" aria-pressed={zoom} onClick={() => setZoom(v => !v)}>{zoom ? 'Fit preview' : 'Enlarge preview'}</button></div>
    </div>}
    {busy && <p className="bl-status" role="status">Reading screenshot…</p>}
    {error && <p className="bl-error" role="alert">{error}</p>}
    {!busy && fields.length > 0 && <>
      <h3 className="bl-review-title">Review bonuses</h3>
      <p className="bl-help">{fields.length} of 8 found. Missing values stay unchanged.</p>
      <div className="bl-grid two">{fields.map(field => {
        const reading = readings[field.key];
        return <div key={field.key} className={reading.uncertain ? 'bl-scan-uncertain' : undefined}>
          <label className="bl-field"><span>{field.label}</span><input type="text" inputMode="decimal" className="calc-input" aria-label={`Scanned ${field.label}`} value={reading.text ?? reading.value}
            onFocus={e => e.target.select()} onChange={e => {
              const raw = e.target.value.replace(/[%\s,]/g, ''), n = Number(raw);
              if (raw !== '' && Number.isFinite(n) && n >= 0 && n <= 10000) confirm(field.key, n, e.target.value);
              else setReadings(p => ({ ...p, [field.key]: { ...p[field.key], value: e.target.value, text: e.target.value, uncertain: true } }));
            }} /></label>
          {reading.uncertain && <><span className="bl-error">Check against the preview.</span><button type="button" disabled={!Number.isFinite(reading.value)} onClick={() => confirm(field.key, reading.value)}>Correct</button>{reading.alternatives.map(value => <button type="button" key={value} onClick={() => confirm(field.key, value)}>Use {value}%</button>)}</>}
        </div>;
      })}</div>
      <button type="button" className="bl-apply" disabled={uncertain} onClick={() => { onApply(readings); setReadings({}); setFile(null); setPreview(''); setStatus('Bonuses saved.'); }}>Use these bonuses</button>
    </>}
    {file && !busy && <button type="button" onClick={() => scan()}>Scan again</button>}
    {!file && status && <p className="bl-status" role="status">{status}</p>}
  </section>;
}
