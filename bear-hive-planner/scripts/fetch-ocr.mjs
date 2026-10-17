import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const assets=JSON.parse(await readFile(new URL('./ocr-assets.json',import.meta.url),'utf8'));
const digest=data=>createHash('sha256').update(data).digest('hex');
async function download(asset){
 const destination=resolve(root,asset.path);
 if(!destination.startsWith(root+'/dist/vendor/ocr/'))throw Error('Asset path is outside OCR directory.');
 try{const data=await readFile(destination);if(data.length===asset.bytes&&digest(data)===asset.sha256)return;}catch{}
 let last;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch(asset.url,{signal:AbortSignal.timeout(120000)});
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   const data=Buffer.from(await response.arrayBuffer());
   if(data.length!==asset.bytes||digest(data)!==asset.sha256)throw Error('Checksum mismatch');
   await mkdir(dirname(destination),{recursive:true});await writeFile(destination,data);console.log(`Verified ${asset.path}`);return;
  }catch(error){last=error;}
 }
 throw Error(`Could not download ${asset.path}: ${last.message}`);
}
const pending=[...assets];await Promise.all(Array.from({length:4},async()=>{while(pending.length)await download(pending.shift());}));
console.log(`OCR assets ready: ${assets.length} verified files.`);
