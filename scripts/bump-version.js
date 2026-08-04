#!/usr/bin/env node
// Авто-інкремент версії застосунку в index.html (єдине джерело істини).
// Використання: node scripts/bump-version.js [major|minor|patch|<x.y.z>]
// За замовчуванням — patch. Також синхронізує fallback-версію в sw.js.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const part = process.argv[2] || 'patch';

function bump(version, part) {
    const parts = version.split('.').map(Number);
    const idx = { major: 0, minor: 1, patch: 2 }[part];
    if (idx === undefined) {
        console.error(`Невідомий рівень версії: ${part}`);
        process.exit(1);
    }
    parts[idx] += 1;
    for (let i = idx + 1; i < parts.length; i++) parts[i] = 0;
    return parts.join('.');
}

const indexHtmlPath = path.join(root, 'index.html');
const swPath = path.join(root, 'sw.js');

const html = readFileSync(indexHtmlPath, 'utf8');
const m = html.match(/window\.APP_VERSION = '(\d+\.\d+\.\d+)'/);
if (!m) {
    console.error('Не знайдено window.APP_VERSION в index.html');
    process.exit(1);
}
const current = m[1];

const next = /^\d+\.\d+\.\d+$/.test(part)
    ? part
    : bump(current, part);

if (next === current) {
    console.log(`Версія вже ${current} — без змін`);
    process.exit(0);
}

writeFileSync(indexHtmlPath, html.replace(
    /window\.APP_VERSION = '\d+\.\d+\.\d+'/,
    `window.APP_VERSION = '${next}'`
));

// Тримаємо fallback у sw.js синхронним (використовується, якщо ?v відсутній)
const sw = readFileSync(swPath, 'utf8');
writeFileSync(swPath, sw.replace(
    /searchParams\.get\('v'\) \|\| '\d+\.\d+\.\d+'/,
    `searchParams.get('v') || '${next}'`
));

console.log(`Версія: ${current} → ${next}`);