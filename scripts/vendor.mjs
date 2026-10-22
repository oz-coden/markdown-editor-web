import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const libraries = {
    marked: { repository: 'https://github.com/markedjs/marked', files: { 'lib/marked.umd.js': 'marked.umd.js', LICENSE: 'LICENSE' } },
    dompurify: { repository: 'https://github.com/cure53/DOMPurify', files: { 'dist/purify.min.js': 'purify.min.js', LICENSE: 'LICENSE', 'LICENSE-MPL': 'LICENSE-MPL.txt' } }
};
const manifest = {};
for (const [name, library] of Object.entries(libraries)) {
    const source = join(root, 'node_modules', name);
    const { version } = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
    const target = join(root, 'vendor', name);
    await mkdir(target, { recursive: true });
    const hashes = {};
    for (const [from, to] of Object.entries(library.files)) {
        await copyFile(join(source, from), join(target, to));
        hashes[to] = createHash('sha256').update(await readFile(join(target, to))).digest('hex');
    }
    manifest[name] = { version, repository: library.repository, files: hashes };
}
await writeFile(join(root, 'vendor-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Updated the bundled Markdown parser and HTML sanitizer.');
