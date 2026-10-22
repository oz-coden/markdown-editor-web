(function () {
    'use strict';
    const tags = ['p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'del', 's', 'blockquote', 'ul', 'ol', 'li', 'pre', 'code', 'a', 'img', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'input', 'details', 'summary', 'kbd', 'sup', 'sub', 'div', 'span'];
    const styles = `
        :root { color-scheme: light; --bg:#fff; --text:#17243b; --sub:#52617a; --border:#dbe2ed; --tint:#f4f6fa; --accent:#2459c4; }
        :root[data-theme="dark"] { color-scheme:dark; --bg:#192438; --text:#edf2fb; --sub:#a7b5cb; --border:#35435a; --tint:#101827; --accent:#96b9ff; }
        * { box-sizing:border-box; }
        body { margin:0; padding:24px; background:var(--bg); color:var(--text); font:16px/1.8 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; overflow-wrap:anywhere; }
        body > :first-child { margin-top:0; }
        h1,h2,h3,h4,h5,h6 { line-height:1.4; margin:1.5em 0 .6em; }
        h1 { font-size:1.9em; } h2 { font-size:1.5em; } h3 { font-size:1.2em; }
        h1,h2 { padding-bottom:.3em; border-bottom:1px solid var(--border); }
        p,ul,ol,pre,table,blockquote,details { margin:0 0 1em; }
        li > p { margin:.5em 0; } ul,ol { padding-left:1.8em; }
        a { color:var(--accent); text-underline-offset:.2em; }
        code,kbd { font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:.875em; background:var(--tint); border-radius:4px; padding:.15em .35em; }
        pre { padding:16px; border:1px solid var(--border); border-radius:8px; background:var(--tint); overflow-x:auto; overflow-wrap:normal; }
        pre code { padding:0; border:0; background:none; }
        blockquote { padding:0 1em; margin-left:0; border-left:4px solid var(--border); color:var(--sub); }
        table { display:block; overflow-x:auto; border-collapse:collapse; max-width:100%; }
        th,td { border:1px solid var(--border); padding:8px 12px; min-width:70px; }
        th { background:var(--tint); text-align:left; }
        img { max-width:100%; height:auto; } input { accent-color:var(--accent); }
        .image-placeholder { display:inline-block; max-width:100%; border:1px dashed var(--border); border-radius:6px; padding:6px 12px; color:var(--sub); font-size:.875em; }
        hr { border:0; border-top:1px solid var(--border); margin:1.5em 0; }
        summary { cursor:pointer; } .empty { color:var(--sub); }
        @media(max-width:480px) { body { padding:18px; } }
    `;
    function build(html, { theme = 'light', externalImages = false } = {}) {
        const fragment = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: tags,
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'type', 'checked', 'disabled', 'start', 'reversed', 'align'],
            ALLOW_DATA_ATTR: false,
            ALLOW_ARIA_ATTR: false,
            RETURN_DOM_FRAGMENT: true
        });
        for (const input of fragment.querySelectorAll('input')) {
            if (input.getAttribute('type') !== 'checkbox') { input.remove(); continue; }
            input.disabled = true;
        }
        for (const link of fragment.querySelectorAll('a')) {
            try {
                const url = new URL(link.getAttribute('href'));
                if (!['https:', 'http:', 'mailto:'].includes(url.protocol)) throw new Error();
                link.href = url.href;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
            } catch (_) { link.removeAttribute('href'); }
        }
        for (const image of fragment.querySelectorAll('img')) {
            const source = image.getAttribute('src') || '';
            const embedded = /^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(source);
            let remote = false;
            try { remote = ['https:', 'http:'].includes(new URL(source).protocol); } catch (_) { /* Relative images have no local file mapping. */ }
            if (!embedded && !(remote && externalImages)) {
                const placeholder = document.createElement('span');
                placeholder.className = 'image-placeholder';
                placeholder.textContent = `画像: ${image.getAttribute('alt') || '名称なし'}（${remote ? '外部画像は未読み込み' : '未対応の画像パス'}）`;
                image.replaceWith(placeholder);
            } else { image.referrerPolicy = 'no-referrer'; }
        }
        const container = document.implementation.createHTMLDocument('').createElement('div');
        container.append(fragment);
        const policy = `default-src 'none'; style-src 'unsafe-inline'; img-src data:${externalImages ? ' https: http:' : ''}; base-uri 'none'; form-action 'none'`;
        return `<!DOCTYPE html><html lang="ja" data-theme="${theme === 'dark' ? 'dark' : 'light'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer"><title>Markdown Preview</title><style>${styles}</style></head><body>${container.innerHTML || '<p class="empty">Markdownを書くと、ここにプレビューが表示されます。</p>'}</body></html>`;
    }
    window.MarkdownPreview = Object.freeze({ build });
})();
