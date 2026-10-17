import { readFile, access, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=await readFile(resolve(root,'dist/index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g))await access(resolve(root,'dist',match[1]));
await rm(resolve(root,'dist/vendor/ocr'),{recursive:true,force:true});
console.log('Bear Hive static build ready. Screenshot OCR is not included.');
