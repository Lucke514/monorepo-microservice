#!/usr/bin/env node
// Load test sin dependencias para los endpoints de jobs.
//
// Uso:
//   node scripts/load-test.mjs --target=emit  --total=50000 --concurrency=200
//   node scripts/load-test.mjs --target=sync  --total=50000 --concurrency=100
//
// Flags (con sus defaults):
//   --target=emit|sync   endpoint a golpear           (emit)
//   --total=50000        nº total de requests          (50000)
//   --concurrency=200    requests en vuelo a la vez    (200)
//   --url=...            base URL                       (http://localhost:3000)
//   --message=load       valor del query ?message=     (load)

import http from 'node:http';
import https from 'node:https';

const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
        const [k, v] = a.replace(/^--/, '').split('=');
        return [k, v ?? true];
    }),
);

const target = args.target ?? 'emit';
const total = Number(args.total ?? 50000);
const concurrency = Number(args.concurrency ?? 200);
const baseUrl = args.url ?? 'http://localhost:3000';
const message = args.message ?? 'load';

const path =
    target === 'sync'
        ? `/jobs/sync?message=${encodeURIComponent(message)}`
        : `/jobs?message=${encodeURIComponent(message)}`;

const url = new URL(baseUrl + path);
const client = url.protocol === 'https:' ? https : http;

// Reutiliza conexiones TCP entre requests (clave para alto throughput).
const agent = new client.Agent({
    keepAlive: true,
    maxSockets: concurrency,
});

const stats = {
    ok: 0,
    fail: 0,
    byStatus: new Map(),
    sent: 0,
    latencies: [], // ms (muestreo)
};

function bump(map, key) {
    map.set(key, (map.get(key) ?? 0) + 1);
}

function once() {
    return new Promise((resolve) => {
        const started = process.hrtime.bigint();
        const req = client.request(
            url,
            { method: 'GET', agent },
            (res) => {
                res.resume(); // descarta el body, solo importa el status
                res.on('end', () => {
                    const ms = Number(process.hrtime.bigint() - started) / 1e6;
                    if (stats.latencies.length < 100000)
                        stats.latencies.push(ms);
                    bump(stats.byStatus, res.statusCode);
                    if (res.statusCode >= 200 && res.statusCode < 300)
                        stats.ok++;
                    else stats.fail++;
                    resolve();
                });
            },
        );
        req.on('error', () => {
            bump(stats.byStatus, 'ERR');
            stats.fail++;
            resolve();
        });
        req.end();
    });
}

function pct(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[idx];
}

async function worker() {
    while (stats.sent < total) {
        stats.sent++;
        await once();
        const done = stats.ok + stats.fail;
        if (done % 5000 === 0) {
            process.stdout.write(`  ...${done}/${total}\n`);
        }
    }
}

async function main() {
    console.log(
        `Load test → ${target.toUpperCase()}  ${url.href}\n` +
            `  total=${total}  concurrency=${concurrency}\n`,
    );
    const t0 = Date.now();
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    const seconds = (Date.now() - t0) / 1000;

    console.log('\n──────── Resultados ────────');
    console.log(`Total:        ${stats.ok + stats.fail}`);
    console.log(`OK (2xx):     ${stats.ok}`);
    console.log(`Fallos:       ${stats.fail}`);
    console.log(
        `Por status:   ${[...stats.byStatus.entries()]
            .map(([k, v]) => `${k}=${v}`)
            .join('  ')}`,
    );
    console.log(`Duración:     ${seconds.toFixed(2)}s`);
    console.log(`Throughput:   ${((stats.ok + stats.fail) / seconds).toFixed(0)} req/s`);
    console.log(
        `Latencia ms:  avg=${(
            stats.latencies.reduce((a, b) => a + b, 0) /
            (stats.latencies.length || 1)
        ).toFixed(1)}  p50=${pct(stats.latencies, 50).toFixed(1)}  p95=${pct(
            stats.latencies,
            95,
        ).toFixed(1)}  p99=${pct(stats.latencies, 99).toFixed(1)}`,
    );
}

main();
