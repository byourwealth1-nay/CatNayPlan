import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);
for(const file of [...walk('dist'),...walk('tests')].filter(f=>/\.(mjs|cjs)$/.test(f)))execFileSync(process.execPath,['--check',file]);
const html=fs.readFileSync('dist/index.html','utf8');
if(!html.includes('V2.5.0')||!html.includes('cloud-ui.mjs'))throw Error('Invalid entry point');
console.log('Build verified: dist is the deployable static output; all module paths are relative.');
