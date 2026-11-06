// Isolated local origin: existing AXP UI + actual Arc rail + fixture providers.
// Startup does not deposit, call a model or submit a payment.
import {createServer, request as httpRequest} from 'node:http';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {createArcDemoService} from '../../packages/arc/demo.mjs';
import {createProductAPI} from '../../packages/product/api.mjs';
const port = Number(process.env.AXP_ARC_PORT ?? 3440), uiPort = port + 2;
const service = createArcDemoService(), api = createProductAPI({service});
const ui = process.argv.includes('--api-only') ? null : spawn(process.execPath,
  [resolve('apps/product-ui/node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', String(uiPort)],
  {cwd: resolve('apps/product-ui'), stdio: 'inherit', env: {...process.env, NEXT_PUBLIC_BASE_PATH: '', NEXT_DIST_DIR: '.next-product-dev', NEXT_TELEMETRY_DISABLED: '1'}});
const server = createServer((req, res) => {
  if (req.url.startsWith('/api/product')) return api.handler(req, res);
  if (!ui) {res.writeHead(404); return res.end('API only');}
  const upstream = httpRequest({hostname: '127.0.0.1', port: uiPort, path: req.url, method: req.method, headers: req.headers}, response => {
    res.writeHead(response.statusCode, response.headers); response.pipe(res);
  });
  upstream.on('error', () => {if (!res.headersSent) res.writeHead(503); res.end('AXP UI is starting. Refresh shortly.');});
  req.pipe(upstream);
});
server.on('upgrade', (req, socket, head) => {
  const proxy = httpRequest({hostname: '127.0.0.1', port: uiPort, path: req.url, headers: req.headers});
  proxy.on('upgrade', (response, upstream, upstreamHead) => {
    socket.on('error', () => upstream.destroy()); upstream.on('error', () => socket.destroy());
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(response.headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')}\r\n\r\n`);
    if (head.length) upstream.write(head); if (upstreamHead.length) socket.write(upstreamHead); socket.pipe(upstream).pipe(socket);
  });
  proxy.on('error', () => socket.destroy()); proxy.end();
});
server.listen(port, '127.0.0.1', () => console.log(`AXP Arc demo: http://127.0.0.1:${port}/advertiser-dashboard/\nChat: http://127.0.0.1:${port}/publisher-demo/?network=arc-testnet\nActual Arc Testnet / Circle Gateway. Fixture buyer and independent answer. No funding on startup.`));
let stopping = false;
function stop() {if (stopping) return; stopping = true; ui?.kill(); server.close(); server.closeAllConnections(); service.close(); setTimeout(() => process.exit(0), 250).unref();}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, stop);
ui?.once('exit', () => {if (!stopping) stop();});
