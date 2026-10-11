let tesseractLoadPromise = null;
export function loadTesseract() {
  if (typeof window !== "undefined" && window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractLoadPromise) return tesseractLoadPromise;
  tesseractLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => { tesseractLoadPromise = null; script.remove(); reject(new Error("Failed to load OCR engine")); };
    document.head.appendChild(script);
  });
  return tesseractLoadPromise;
}
