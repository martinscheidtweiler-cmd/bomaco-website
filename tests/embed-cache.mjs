// Integration/load test against a local production Next server and mock public RPCs.
// No traffic is sent to Supabase, Pweb, or Hippomundo.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const token = '9437bfd9-f41f-497d-9b8b-f98a7ff86176';
const other = '9437bfd9-f41f-497d-9b8b-f98a7ff86177';
const counts = {};
let mode = 'ok';
let version = 1;
const mock = createServer(async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  const name = req.url.split('/').at(-1);
  const p = JSON.parse(body || '{}').p_token;
  const key = `${name}:${p}`;
  counts[key] = (counts[key] || 0) + 1;
  if (mode === 'fail') { res.writeHead(503); res.end('Unavailable'); return; }
  res.setHeader('Content-Type', 'application/json');
  if (mode === 'withdrawn' || p === other) { res.end('null'); return; }
  const horses = Array.from({ length: 15 }, (_, i) => ({name: `Cache Test v${version} Horse ${i}`, year: '2024', level: ''}));
  const value = name === 'get_published_lot_content' ? {horses, profiles: [], description: { sections: [] }}
    : name === 'get_published_pedigree' ? horses : Array(15).fill('');
  res.end(JSON.stringify(value));
});
await new Promise(resolve => mock.listen(4101, '127.0.0.1', resolve));
const env = {...process.env, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:4101', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-publishable-key'};
let next;
async function run(cmd, args) {
  const child = spawn(cmd, args, {env, stdio: 'inherit'});
  const code = await new Promise(resolve => child.on('exit', resolve));
  assert.equal(code, 0, `${cmd} failed`);
}
async function page(path, expectedSite) {
  const start = performance.now();
  const r = await fetch(`http://127.0.0.1:4100${path}`, {signal: AbortSignal.timeout(30000)});
  const html = await r.text();
  assert.equal(r.status, 200);
  assert.ok(html.includes('Cache Test v1 Horse 0'));
  if (expectedSite) assert.ok(html.includes(`data-optimus-site="${expectedSite}"`), `wrong site ${expectedSite}`);
  return {ms: performance.now()-start, cache: r.headers.get('x-nextjs-cache'), html};
}
async function burst(path, site, label) {
  const results = await Promise.all(Array.from({length:500}, () => page(path,site)));
  const timings = results.map(r=>r.ms).sort((a,b)=>a-b);
  const statuses = results.reduce((m,r)=>(m[r.cache]=(m[r.cache]||0)+1,m),{});
  console.log(JSON.stringify({label, requests:500, errors:0,p95ms:Math.round(timings[474]),cache:statuses,upstream:{...counts}}));
}
try {
  await run('npm',['run','build']);
  next = spawn('node',['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','4100'],{env,stdio:['ignore','pipe','pipe']});
  let logs = '';
  next.stdout.on('data',b=>{logs+=b;process.stdout.write(b);}); next.stderr.on('data',b=>{logs+=b;process.stderr.write(b);});
  for(let i=0;i<100;i++) { if(logs.includes('Ready')) break; if(next.exitCode!==null) throw new Error(logs); await delay(100); }
  const base = `/lot/live/${token}`;
  const pedigree = `/pedigree/live/${token}`;
  console.log('Starting cold burst');
  await burst(base+'?site=auction','auction','cold auction');
  assert.equal(counts[`get_published_lot_content:${token}`],1,'cold burst must collapse RPCs');
  await burst(base,'be','be variant');
  await burst(pedigree,null,'cold pedigree');
  assert.equal(counts[`get_published_pedigree:${token}`],1);
  assert.equal(counts[`get_published_pedigree_videos:${token}`],1);
  const before = JSON.stringify(counts);
  await burst(base+'?site=auction','auction','warm auction');
  assert.equal(JSON.stringify(counts),before,'warm page must make no RPCs');
  for(const path of ['/lot/live/invalid',`/lot/live/${other}`,`/pedigree/live/${other}`]) {
    const r = await fetch('http://127.0.0.1:4100'+path); await r.text(); assert.equal(r.status,404);
  }
  mode='fail';
  console.log('Waiting for the real 60-second cache lifetime, then simulating upstream outage.');
  await delay(61000);
  await burst(base+'?site=auction','auction','expired cache + database outage');
  await burst(pedigree,null,'pedigree + database outage');
  await delay(1500);
  await page(base+'?site=auction','auction'); await page(pedigree);
  mode='ok'; version=2;
  console.log('Waiting for background recovery and publication updates.');
  let recovered = false;
  for(let i=0;i<135;i++) {
    const r=await fetch('http://127.0.0.1:4100'+base+'?site=auction'); const html=await r.text();
    assert.equal(r.status,200);
    if(html.includes('Cache Test v2 Horse 0')) {recovered=true;break;}
    await delay(1000);
  }
  assert.ok(recovered,'published updates must recover automatically');
  console.log('PASS: 3,000 requests, site separation, cache reuse, invalid/private tokens, stale-on-error, and automatic recovery.');
} finally {next?.kill('SIGTERM'); mock.closeAllConnections();mock.close();}
