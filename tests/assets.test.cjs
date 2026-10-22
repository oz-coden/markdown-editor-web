const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');

test('vendored libraries and shared UI match their recorded versions and hashes', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'vendor-manifest.json')));
    const ui = JSON.parse(fs.readFileSync(path.join(root, 'shared-ui.json')));
    manifest.ui = ui;
    for (const [name, library] of Object.entries(manifest)) {
        for (const [file, hash] of Object.entries(library.files)) {
            const body = fs.readFileSync(path.join(root, 'vendor', name, file));
            assert.equal(createHash('sha256').update(body).digest('hex'), hash, `${name}/${file}`);
        }
    }
    for (const name of ['marked', 'dompurify']) {
        assert.equal(manifest[name].version, require('../package.json').devDependencies[name]);
    }
});

test('the entry page and parser worker reference bundled assets only', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    for (const [, file] of html.matchAll(/(?:src|href)="([^"]+\.(?:css|js))"/g)) {
        assert.ok(!file.includes('://'), file);
        assert.ok(fs.existsSync(path.join(root, file)), file);
    }
    assert.match(html, /sandbox="allow-popups allow-popups-to-escape-sandbox"/);
    assert.ok(!html.includes('allow-scripts'));
    const worker = fs.readFileSync(path.join(root, 'parser-worker.js'), 'utf8');
    const [, library] = worker.match(/importScripts\('([^']+)'\)/);
    assert.ok(fs.existsSync(path.join(root, library)));
});
