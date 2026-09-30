import {existsSync,copyFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
if(existsSync('.dev.vars'))copyFileSync('.dev.vars','dist/server/.dev.vars');
const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--ip','127.0.0.1','--inspector-port','0'],{stdio:'inherit'});process.exit(r.status??1);
