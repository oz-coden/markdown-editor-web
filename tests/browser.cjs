const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile, mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    try { res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'text/plain' }); res.end(await readFile(file)); }
    catch (_) { res.writeHead(404).end(); }
});
const key = 'oz_markdown_editor_v1';
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    let browser;
    let context;
    let count = 0;
    const temporary = await mkdtemp(path.join(tmpdir(), 'markdown-editor-test-'));
    const check = async (name, run) => { await run(); count++; console.log('PASS ' + name); };
    try {
        browser = await chromium.launch(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {});
        context = await browser.newContext();
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const editor = page.locator('#markdown-input');
        const frame = page.frameLocator('#preview');
        const ready = () => page.waitForFunction(() => document.getElementById('render-status').textContent === 'プレビューは最新です');
        await check('the sample renders GFM tables, task lists, code and shared UI', async () => {
            await page.goto(base);
            await ready();
            assert.equal(await frame.locator('table').count(), 1);
            assert.equal(await frame.locator('input[type=checkbox]:disabled').count(), 3);
            assert.match(await frame.locator('pre code').innerText(), /Hello, Markdown!/);
            assert.equal(await page.locator('[data-ui-theme]').count(), 1);
        });
        await check('live edits preserve Unicode and restore the exact source after reload', async () => {
            const source = '# 日本語 😀\n\n**太字**と~~取り消し線~~\n\n末尾の空白  \n';
            await editor.fill(source);
            await page.waitForFunction(source => JSON.parse(localStorage.getItem('oz_markdown_editor_v1'))?.text === source, source);
            await ready();
            assert.equal(await frame.locator('h1').innerText(), '日本語 😀');
            await page.locator('#filename').fill('日本語.md');
            await page.reload();
            await ready();
            assert.equal(await editor.inputValue(), source);
            assert.equal(await page.locator('#filename').inputValue(), '日本語.md');
        });
        await check('HTML is sanitized and external images cause no default network request', async () => {
            let requests = 0;
            await context.route('https://images.example.test/**', route => {
                requests++;
                return route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jCTsAAAAASUVORK5CYII=', 'base64') });
            });
            await editor.fill('# 安全な本文\n\n<script>parent.document.body.dataset.injected="yes"</script>\n\n<style>body{display:none}</style>\n\n<iframe src="https://images.example.test/frame"></iframe>\n\n<img src="https://images.example.test/pixel.png" onerror="parent.alert(1)">\n\n[危険](javascript:alert(1))\n\n<form><input name="x"></form>');
            await ready();
            await frame.locator('.image-placeholder').waitFor();
            assert.equal(await frame.locator('script,style:not(head style),iframe,form,[onerror],a[href^="javascript:"]').count(), 0);
            assert.equal(await frame.locator('img').count(), 0);
            assert.equal(requests, 0);
            assert.equal(await page.locator('body').getAttribute('data-injected'), null);
            assert.ok(!(await page.locator('#preview').getAttribute('sandbox')).includes('allow-scripts'));
            await page.locator('#external-images').check();
            await frame.locator('img').waitFor();
            await page.waitForFunction(() => document.getElementById('preview').srcdoc.includes('https://images.example.test/pixel.png'));
            assert.equal(await frame.locator('img').getAttribute('referrerpolicy'), 'no-referrer');
            // The image request is observable only after the iframe has loaded.
            await page.waitForEvent('request', { predicate: req => req.url().startsWith('https://images.example.test/'), timeout: 2000 }).catch(() => {});
            assert.ok(requests >= 1);
            await page.locator('#external-images').uncheck();
            await frame.locator('.image-placeholder').waitFor();
        });
        await check('format controls preserve selection and support native undo and shortcuts', async () => {
            await editor.fill('hello');
            await editor.click();
            await editor.press('Control+a');
            await page.locator('[data-format=bold]').click();
            assert.equal(await editor.inputValue(), '**hello**');
            await editor.press('Control+z');
            assert.equal(await editor.inputValue(), 'hello');
            await editor.click();
            await editor.press('Control+a');
            await editor.press('Control+i');
            assert.equal(await editor.inputValue(), '*hello*');
            await ready();
            assert.equal(await frame.locator('em').innerText(), 'hello');
        });
        await check('Markdown downloads contain the exact source and a safe filename', async () => {
            const source = '# 保存 😀\n\n本文  \n';
            await editor.fill(source);
            await page.locator('#filename').fill('../unsafe/name');
            const pending = page.waitForEvent('download');
            await page.locator('#save-button').click();
            const download = await pending;
            assert.ok(!/[\\/]/.test(download.suggestedFilename()));
            assert.match(download.suggestedFilename(), /\.md$/);
            const destination = path.join(temporary, 'saved.md');
            await download.saveAs(destination);
            assert.equal(await readFile(destination, 'utf8'), source);
        });
        await check('reset can be canceled and confirmed, and empty drafts survive reload', async () => {
            const source = await editor.inputValue();
            await page.locator('#reset-button').click();
            await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
            assert.equal(await editor.inputValue(), source);
            await page.locator('#reset-button').click();
            await page.locator('#replace-confirm').click();
            assert.equal(await editor.inputValue(), '');
            await page.reload();
            await ready();
            assert.equal(await editor.inputValue(), '');
            assert.equal(JSON.parse(await page.evaluate(key => localStorage.getItem(key), key)).text, '');
        });
        await check('UTF-8 files load without truncation and invalid or oversized files keep the draft', async () => {
            const source = '# ファイル 😀\n\n本文\n';
            await page.locator('#open-file').setInputFiles({ name: 'test.md', mimeType: 'text/markdown', buffer: Buffer.from('\ufeff' + source) });
            await page.waitForFunction(source => document.getElementById('markdown-input').value === source, source);
            assert.equal(await page.locator('#filename').inputValue(), 'test.md');
            await page.locator('#open-file').setInputFiles({ name: 'bad.md', mimeType: 'text/markdown', buffer: Buffer.from([0xff, 0xfe, 0x41]) });
            await page.getByText('UTF-8のテキストファイルを読み込めませんでした。', { exact: true }).waitFor();
            assert.equal(await editor.inputValue(), source);
            await page.locator('#open-file').setInputFiles({ name: 'large.md', mimeType: 'text/markdown', buffer: Buffer.alloc(1024 * 1024 + 1, 65) });
            await page.getByText('1 MiB以下のUTF-8ファイルを選んでください。', { exact: true }).waitFor();
            assert.equal(await editor.inputValue(), source);
        });
        await check('late file reads cannot overwrite subsequent edits', async () => {
            await page.evaluate(() => {
                const original = File.prototype.arrayBuffer;
                File.prototype.arrayBuffer = async function () {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return original.call(this);
                };
            });
            await page.locator('#open-file').setInputFiles({ name: 'slow.md', mimeType: 'text/markdown', buffer: Buffer.from('# stale') });
            await editor.fill('# fresh');
            await page.getByText('編集中に内容が変わったため、ファイルの読み込みを中止しました。', { exact: true }).waitFor();
            assert.equal(await editor.inputValue(), '# fresh');
        });
        await check('large input stops preview while preserving editing and saving', async () => {
            const source = 'a'.repeat(200001);
            await editor.fill(source);
            await page.getByText('20万文字相当の上限を超えたため、プレビューを停止しました。', { exact: true }).waitFor();
            assert.equal((await editor.inputValue()).length, source.length);
            assert.equal(await page.locator('#save-button').isEnabled(), true);
            await editor.fill('# 復帰');
            await ready();
            assert.equal(await frame.locator('h1').innerText(), '復帰');
        });
        await check('light and dark themes and narrow layouts support all view modes', async () => {
            await page.locator('[data-ui-theme]').click();
            assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
            await frame.locator('html[data-theme=dark]').waitFor();
            for (const width of [320, 390, 768, 1440]) {
                await page.setViewportSize({ width, height: 900 });
                for (const view of ['editor', 'preview', 'split']) {
                    await page.locator(`button[data-view=${view}]`).click();
                    assert.equal(await page.locator(`#${view === 'editor' ? 'preview' : 'editor'}-panel`).isVisible(), view === 'split');
                    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px ${view}`);
                }
            }
        });
        await check('another tab cannot silently overwrite this tab or be overwritten on pagehide', async () => {
            await editor.fill('# first');
            await page.waitForFunction(() => JSON.parse(localStorage.getItem('oz_markdown_editor_v1'))?.text === '# first');
            const other = await context.newPage();
            await other.goto(base);
            await other.locator('#markdown-input').fill('# second');
            await other.waitForFunction(() => JSON.parse(localStorage.getItem('oz_markdown_editor_v1'))?.text === '# second');
            await page.getByText('別タブで保存が更新されたため、自動保存を停止中', { exact: true }).waitFor();
            assert.equal(await editor.inputValue(), '# first');
            await editor.fill('# first edited');
            await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
            assert.equal(JSON.parse(await page.evaluate(key => localStorage.getItem(key), key)).text, '# second');
            await other.close();
        });
        await check('unavailable storage and workers leave the editor and downloads usable', async () => {
            const isolated = await browser.newContext();
            await isolated.addInitScript(() => {
                Storage.prototype.setItem = () => { throw new Error('blocked'); };
                window.Worker = class { constructor() { throw new Error('blocked'); } };
            });
            const fallback = await isolated.newPage();
            await fallback.goto(base);
            await fallback.locator('#markdown-input').fill('# preserved');
            await fallback.getByText('自動保存できません。ファイルに保存してください', { exact: true }).waitFor();
            assert.equal(await fallback.locator('#save-button').isEnabled(), true);
            assert.equal(await fallback.locator('#markdown-input').inputValue(), '# preserved');
            await isolated.close();
        });
        assert.deepEqual(errors, []);
        console.log(`Passed ${count} Markdown Editor browser checks.`);
    } finally {
        await context?.close();
        await browser?.close();
        await new Promise(resolve => server.close(resolve));
        await rm(temporary, { recursive: true, force: true });
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
