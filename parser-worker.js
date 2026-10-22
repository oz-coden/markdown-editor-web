'use strict';
importScripts('vendor/marked/marked.umd.js');
self.onmessage = ({ data }) => {
    try {
        const html = marked.parse(data.source, { gfm: true, breaks: false, async: false });
        self.postMessage({ html });
    } catch (_) {
        self.postMessage({ error: 'Markdownを変換できませんでした。入力内容を確認してください。' });
    }
};
