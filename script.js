(function () {
    'use strict';
    const STORAGE_KEY = 'oz_markdown_editor_v1';
    const MAX_LENGTH = 200000;
    const MAX_FILE_BYTES = 1024 * 1024;
    const SAMPLE = '# Markdown Editor\n\n書きながら、仕上がりを確認できるエディターです。\n\n## できること\n\n- **太字**や*斜体*、~~取り消し線~~\n- [Markdownの記法](https://www.markdownguide.org/basic-syntax/)を確認\n- Markdownファイルの読み込みと保存\n\n### チェックリスト\n\n- [x] Markdownを書く\n- [ ] プレビューで確認する\n- [ ] ファイルに保存する\n\n### 表\n\n| 操作 | ショートカット |\n| --- | --- |\n| 保存 | Ctrl / ⌘ + S |\n| 太字 | Ctrl / ⌘ + B |\n| 斜体 | Ctrl / ⌘ + I |\n\n### コード\n\n```javascript\nconst greeting = "Hello, Markdown!";\nconsole.log(greeting);\n```\n\n> 入力内容はこのブラウザに自動保存されます。\n> 大切な文章は、Markdownファイルとして保存しておきましょう。\n';
    const input = document.getElementById('markdown-input');
    const filename = document.getElementById('filename');
    const preview = document.getElementById('preview');
    const renderStatus = document.getElementById('render-status');
    const saveStatus = document.getElementById('save-status');
    const status = document.getElementById('tool-status');
    const images = document.getElementById('external-images');
    const dialog = document.getElementById('replace-dialog');
    let revision = 0;
    let fileSequence = 0;
    let pendingReplacement = null;
    let parser = null;
    let parserTimeout = null;
    let renderTimer = null;
    let saveTimer = null;
    let renderedHTML = '';
    let renderedSource = null;
    let needsSave = false;
    let storageConflict = false;
    function notify(message, error = false) {
        status.textContent = message;
        status.classList.toggle('ui-error', error);
    }
    function safeFilename(value) {
        const name = String(value).replace(/[\\/<>:"|?*\u0000-\u001f\u007f]/g, '_').replace(/[. ]+$/g, '').trim().slice(0, 100) || 'document';
        return /\.(?:md|markdown)$/i.test(name) ? name : name + '.md';
    }
    function saveLocal() {
        clearTimeout(saveTimer);
        if (storageConflict) return false;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ text: input.value, filename: filename.value }));
            saveStatus.textContent = 'このブラウザに自動保存済み';
            saveStatus.classList.remove('ui-error');
            needsSave = false;
            return true;
        } catch (_) {
            saveStatus.textContent = '自動保存できません。ファイルに保存してください';
            saveStatus.classList.add('ui-error');
            return false;
        }
    }
    function updateCounts() {
        const characters = Array.from(input.value).length.toLocaleString('ja-JP');
        const lines = input.value ? input.value.split(/\r\n|\r|\n/).length : 0;
        document.getElementById('counts').textContent = `${characters}文字 · ${lines.toLocaleString('ja-JP')}行`;
    }
    function stopParser() {
        parser?.terminate();
        parser = null;
        clearTimeout(parserTimeout);
    }
    function showPreview() {
        preview.srcdoc = MarkdownPreview.build(renderedHTML, { theme: document.documentElement.dataset.theme, externalImages: images.checked });
    }
    function unavailable(message) {
        stopParser();
        renderedSource = null;
        renderedHTML = '<p>プレビューを表示できません。編集とMarkdownの保存は続けられます。</p>';
        showPreview();
        renderStatus.textContent = message;
        renderStatus.classList.add('ui-error');
    }
    function render() {
        clearTimeout(renderTimer);
        stopParser();
        const source = input.value;
        if (source.length > MAX_LENGTH) { unavailable('20万文字相当の上限を超えたため、プレビューを停止しました。'); return; }
        if (source === renderedSource) {
            showPreview();
            renderStatus.textContent = 'プレビューは最新です';
            renderStatus.classList.remove('ui-error');
            return;
        }
        renderStatus.textContent = 'プレビューを更新しています…';
        renderStatus.classList.remove('ui-error');
        const expectedRevision = revision;
        try {
            const worker = new Worker('parser-worker.js');
            parser = worker;
            worker.onmessage = ({ data }) => {
                if (parser !== worker) return;
                stopParser();
                if (expectedRevision !== revision) return;
                if (data.error || typeof data.html !== 'string') { unavailable(data.error || '変換に失敗しました。'); return; }
                renderedHTML = data.html;
                renderedSource = source;
                try { showPreview(); renderStatus.textContent = 'プレビューは最新です'; }
                catch (_) { unavailable('プレビューを表示できませんでした。'); }
            };
            worker.onerror = event => {
                event.preventDefault();
                if (parser === worker) unavailable('変換処理を開始できません。HTTPサーバー経由で開いてください。');
            };
            parserTimeout = setTimeout(() => unavailable('変換に時間がかかるため停止しました。入力を短くして再試行してください。'), 2500);
            parser.postMessage({ source });
        } catch (_) { unavailable('この環境ではプレビューを開始できません。'); }
    }
    function changed() {
        revision++;
        needsSave = true;
        updateCounts();
        if (!storageConflict) {
            saveStatus.textContent = '自動保存しています…';
            clearTimeout(saveTimer);
            saveTimer = setTimeout(saveLocal, 250);
        }
        clearTimeout(renderTimer);
        stopParser();
        renderStatus.textContent = 'プレビューの更新待ち…';
        renderStatus.classList.remove('ui-error');
        renderTimer = setTimeout(render, 180);
    }
    function replaceDocument(text, name, message) {
        input.value = text;
        filename.value = name;
        fileSequence++;
        changed();
        saveLocal();
        render();
        notify(message);
    }
    function requestReplacement(action) {
        if (!input.value) { action(); return; }
        pendingReplacement = { action, revision };
        dialog.returnValue = '';
        dialog.showModal();
    }
    dialog.addEventListener('close', () => {
        // A queued close event must not consume a replacement from a reopened dialog.
        if (dialog.open) return;
        const pending = pendingReplacement;
        pendingReplacement = null;
        if (dialog.returnValue !== 'replace' || !pending) return;
        if (pending.revision !== revision) { notify('編集内容が変わったため、置き換えを中止しました。', true); return; }
        pending.action();
    });
    function download() {
        const name = safeFilename(filename.value);
        const blob = new Blob([input.value], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        saveLocal();
        notify(`${name} の保存を開始しました。`);
    }
    function insertFormat(kind) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const selected = input.value.slice(start, end);
        let text;
        let selectionOffset = 0;
        let selectionLength;
        if (kind === 'bold' || kind === 'italic' || kind === 'link') {
            const content = selected || (kind === 'link' ? 'リンク名' : 'テキスト');
            const prefix = kind === 'bold' ? '**' : kind === 'italic' ? '*' : '[';
            const suffix = kind === 'link' ? '](https://example.com)' : prefix;
            text = prefix + content + suffix;
            selectionOffset = prefix.length;
            selectionLength = content.length;
        } else {
            const newline = start > 0 && input.value[start - 1] !== '\n' ? '\n' : '';
            if (kind === 'code') {
                let longest = 2;
                for (const match of selected.matchAll(/`+/g)) longest = Math.max(longest, match[0].length);
                const fence = '`'.repeat(longest + 1);
                text = `${newline}${fence}\n${selected || 'コード'}\n${fence}\n`;
                selectionOffset = newline.length + fence.length + 1;
                selectionLength = (selected || 'コード').length;
            } else if (kind === 'table') {
                text = `${newline}| 見出し | 見出し |\n| --- | --- |\n| 内容 | 内容 |\n`;
            } else {
                const prefix = { heading: '## ', list: '- ', task: '- [ ] ', quote: '> ' }[kind];
                text = newline + (selected || 'テキスト').split('\n').map(line => prefix + line).join('\n');
                selectionOffset = newline.length + prefix.length;
                selectionLength = selected ? text.length - selectionOffset : 'テキスト'.length;
            }
        }
        input.focus();
        const before = revision;
        // Native insertion preserves the browser's undo history where supported.
        if (!document.execCommand('insertText', false, text)) input.setRangeText(text, start, end, 'end');
        input.setSelectionRange(start + selectionOffset, start + selectionOffset + (selectionLength ?? text.length));
        if (revision === before) input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    input.addEventListener('input', changed);
    filename.addEventListener('input', () => { revision++; needsSave = true; saveLocal(); render(); });
    document.getElementById('save-button').addEventListener('click', download);
    document.getElementById('copy-button').addEventListener('click', async () => {
        try { await OzUI.copyText(input.value); notify('Markdownをコピーしました。'); }
        catch (_) { notify('コピーできませんでした。入力欄から直接コピーしてください。', true); }
    });
    document.getElementById('sample-button').addEventListener('click', () => requestReplacement(() => replaceDocument(SAMPLE, 'sample.md', 'サンプルを読み込みました。')));
    document.getElementById('reset-button').addEventListener('click', () => requestReplacement(() => replaceDocument('', 'document.md', '入力をリセットしました。')));
    document.getElementById('open-button').addEventListener('click', () => document.getElementById('open-file').click());
    async function loadFile(file) {
        const sequence = ++fileSequence;
        const expectedRevision = revision;
        if (file.size > MAX_FILE_BYTES) { notify('1 MiB以下のUTF-8ファイルを選んでください。', true); return; }
        try {
            const bytes = await file.arrayBuffer();
            const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            if (sequence !== fileSequence) return;
            if (expectedRevision !== revision) { notify('編集中に内容が変わったため、ファイルの読み込みを中止しました。', true); return; }
            if (text.length > MAX_LENGTH) { notify('ファイルの内容が20万文字相当の上限を超えています。', true); return; }
            requestReplacement(() => replaceDocument(text, safeFilename(file.name), 'ファイルを読み込みました。'));
        } catch (_) {
            if (sequence === fileSequence) notify('UTF-8のテキストファイルを読み込めませんでした。', true);
        }
    }
    document.getElementById('open-file').addEventListener('change', event => {
        const file = event.target.files[0];
        event.target.value = '';
        if (file) loadFile(file);
    });
    const workspace = document.getElementById('workspace');
    workspace.addEventListener('dragover', event => {
        if (Array.from(event.dataTransfer.types).includes('Files')) event.preventDefault();
    });
    workspace.addEventListener('drop', event => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        if (event.dataTransfer.files.length !== 1) { notify('ファイルは1つずつ読み込んでください。', true); return; }
        loadFile(event.dataTransfer.files[0]);
    });
    document.querySelectorAll('[data-view]').forEach(button => {
        if (button === workspace) return;
        button.addEventListener('click', () => {
            workspace.dataset.view = button.dataset.view;
            document.querySelectorAll('button[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        });
    });
    document.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => insertFormat(button.dataset.format)));
    document.addEventListener('keydown', event => {
        if (dialog.open || event.isComposing || !(event.ctrlKey || event.metaKey) || event.altKey) return;
        const key = event.key.toLowerCase();
        if (key === 's') { event.preventDefault(); download(); }
        if (event.target === input && (key === 'b' || key === 'i')) { event.preventDefault(); insertFormat(key === 'b' ? 'bold' : 'italic'); }
    });
    images.addEventListener('change', showPreview);
    window.addEventListener('themeChanged', () => { if (renderedSource !== null) showPreview(); });
    window.addEventListener('storage', event => {
        if (event.key !== STORAGE_KEY && event.key !== null) return;
        storageConflict = true;
        clearTimeout(saveTimer);
        saveStatus.textContent = '別タブで保存が更新されたため、自動保存を停止中';
        saveStatus.classList.add('ui-error');
        notify('別タブの保存内容を保護するため、自動保存を停止しました。必要な内容をファイルに保存してから再読み込みしてください。', true);
    });
    window.addEventListener('pagehide', () => { if (needsSave) saveLocal(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && needsSave) saveLocal(); });
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const saved = stored === null ? null : JSON.parse(stored);
        if (saved && typeof saved.text === 'string' && typeof saved.filename === 'string') {
            input.value = saved.text;
            filename.value = saved.filename.slice(0, 120);
        } else {
            input.value = SAMPLE;
            if (stored !== null) notify('自動保存データを読み込めなかったため、サンプルを表示しています。', true);
        }
    } catch (_) { input.value = SAMPLE; notify('自動保存データを読み込めませんでした。', true); }
    updateCounts();
    render();
})();
