OCR assets are bundled for local browser recognition.

- Tesseract.js 6.0.1: https://github.com/naptha/tesseract.js (Apache-2.0; LICENSE-tesseract.md)
- Tesseract.js-core 6.0.0: https://github.com/naptha/tesseract.js-core (Apache-2.0; LICENSE-core.txt)
- Trained data: @tesseract.js-data/{eng,rus,kor,chi_sim,ara} 1.0.0 / 4.0.0, distributed through jsDelivr. Origin: https://github.com/tesseract-ocr/tessdata (Apache-2.0).

No screenshots are sent to an OCR service. Only local workers process image pixels. Recognition accuracy depends on image quality and language. This distribution retains both SIMD and non-SIMD core variants for browser capability selection.
