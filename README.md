# Markdown Editor

日本語の説明は[目次](#目次)から読めます。

## Table of Contents

1. [Summary](#summary)
2. [Background of Development](#background-of-development)
3. [Features](#features)
4. [Requirements, Dependencies](#requirements-dependencies)
5. [Installation](#installation)
6. [LICENSE](#license)
7. [CREDIT](#credit)

## Summary

A lightweight browser-based Markdown editor with live preview, local autosave and Markdown file downloads. Editing and Markdown conversion run entirely on your device.

[Playground Is Here!](https://tools.oz-coden.com/markdown-editor/)

## Background of Development

The aim is to write and check Markdown in one place without installing an editor or uploading a document. The application uses static files and bundles its parser, sanitizer and shared UI assets.

## Features

- Live Markdown preview with headings, emphasis, strikethrough, blockquotes, lists, links, images, tables, task lists and fenced code blocks.
- Split, editor-only and preview-only views. Split view stacks the panes vertically on small screens.
- UTF-8 file opening and drag-and-drop, Markdown downloads, clipboard copying and editable download filenames.
- Local autosave, draft restoration, a sample document and confirmation before replacing or resetting nonempty content.
- Formatting buttons and keyboard shortcuts: **Ctrl / ⌘ + S** to save, **Ctrl / ⌘ + B** for bold, **Ctrl / ⌘ + I** for italic.
- Shared light and dark themes, including the preview.
- Sanitized HTML in a sandboxed preview. Markdown parsing runs in a terminable Web Worker.

### Supported Markdown and limits

The parser uses Marked's GitHub-flavored Markdown mode. Rendering resembles GitHub but is not an exact reproduction of GitHub's renderer. GitHub-specific alerts, footnotes, automatic heading anchors, math, Mermaid and code syntax highlighting are not implemented. A single newline follows ordinary Markdown paragraph rules; use a blank line for a new paragraph or two trailing spaces for a hard line break.

Safe HTML elements, including `details`, `summary` and `kbd`, can be displayed. Scripts, embedded frames, styles, forms and event handlers are removed. Task-list checkboxes are display-only. Absolute HTTP(S) and `mailto:` links open separately when selected. Relative links and fragment links are displayed as text without navigation.

The preview accepts up to **200,000 UTF-16 code units**, with a 2.5-second parsing timeout. If the limit is exceeded, previewing stops while the source remains editable and downloadable. File opening accepts one UTF-8 file of at most **1 MiB**, subject to the same text limit. A UTF-8 BOM is removed when opening a file, and the editor normalizes line endings to LF. Invalid UTF-8 is rejected without replacing the current draft.

## Requirements, Dependencies

- The latest stable version of a web browser with JavaScript enabled.

The interface is in Japanese. File downloads and clipboard access depend on the browser and device. Web Workers require serving the files over HTTP(S), rather than opening `index.html` directly with `file://`.

All runtime dependencies are bundled in `vendor/`:

| Component | Version | Purpose |
| --- | --- | --- |
| [Marked](https://github.com/markedjs/marked) | 18.1.1 | Markdown parsing |
| [DOMPurify](https://github.com/cure53/DOMPurify) | 3.4.17 | HTML sanitization |
| [oz-coden.com-ui-web](https://github.com/oz-coden/oz-coden.com-ui-web) | Recorded in `shared-ui.json` | Shared UI and themes |

## Installation

1. Clone or download this repository, keeping the directory structure intact.
2. Start a static HTTP server at the repository root. For example, with Python 3:

   ```sh
   python -m http.server 8000
   ```

3. Open `http://localhost:8000/` in your browser.

The application needs only static HTML, CSS and JavaScript. Node.js, dependency installation, a build step and an API server are not required to use it.

### Usage

1. Edit the sample, choose **ファイルを開く** to open a file, or drag one file into either pane. Replacing a nonempty document requires confirmation.
2. Write in **Markdown** and check the preview. Formatting buttons apply to the selected text or insert a placeholder.
3. Choose **分割**, **編集** or **プレビュー** to change the view.
4. Set a filename and choose **Markdownを保存**, or press **Ctrl / ⌘ + S**. **コピー** copies the Markdown source.
5. **リセット** empties the draft and replaces its local autosave with an empty document. **サンプル** replaces it with the sample. Both ask for confirmation when the current draft is nonempty.

### Privacy and local storage

The application does not upload Markdown, file contents or filenames. It uses no analytics, API service or external CDN. External images are blocked by default. Enabling **外部画像を読み込む** lets the preview request absolute HTTP(S) image URLs, without a referrer; those image servers receive the requests. Embedded PNG, JPEG, GIF and WebP data URLs can be displayed without network requests. Relative image paths are not resolved, and dropping a Markdown file does not grant access to adjacent image files. Following a link opens its destination normally.

The draft and filename are saved in this origin's `localStorage` under `oz_markdown_editor_v1`. The external-image setting is not restored on reload. Drafts can be unavailable in private browsing, when storage is blocked or full, or after browser data is cleared. The application reports save failures and leaves file downloads available. If another tab changes the saved draft, this tab keeps its current text and pauses autosave to protect the other tab's data; download any needed text before reloading. Local autosave is not a backup.

### Development and publication

With Node.js 22 or later:

```sh
npm ci
npm run check
npx playwright install --with-deps --only-shell chromium
npm test
```

The automated browser checks use Chromium. Other browser engines are not covered by these tests.

Application behavior and layout are in `script.js`, `preview.js`, `parser-worker.js` and `style.css`. After changing dependency versions in `package.json`, run `npm install` and `npm run vendor`, then commit the lockfile, `vendor/` files and `vendor-manifest.json`. The manifest records versions and SHA-256 hashes; the asset checks verify them.

To update shared UI, clone its repository alongside this repository and run `node ../oz-coden.com-ui-web/scripts/sync-ui.mjs . COMMIT_SHA` from this application's root, replacing `COMMIT_SHA` with the full 40-character commit to use. Commit `vendor/ui/` and `shared-ui.json` together.

The hosted application is assembled and published through [tools.oz-coden.com](https://github.com/oz-coden/tools.oz-coden.com). Its publication workflow updates shared UI and runs the dedicated browser checks before deployment.

## LICENSE

This project is released under the [MIT License](LICENSE). Bundled third-party components retain their own licenses: [Marked](vendor/marked/LICENSE), [DOMPurify (Apache 2.0)](vendor/dompurify/LICENSE), [DOMPurify (MPL 2.0)](vendor/dompurify/LICENSE-MPL.txt) and [shared UI](vendor/ui/LICENSE).

## CREDIT

- Markdown parser: [Marked](https://github.com/markedjs/marked).
- HTML sanitizer: [DOMPurify](https://github.com/cure53/DOMPurify).
- Shared styles, navigation and themes: [oz-coden.com-ui-web](https://github.com/oz-coden/oz-coden.com-ui-web).

---

# Markdownエディター

## 目次

1. [概要](#概要)
2. [開発背景](#開発背景)
3. [機能](#機能)
4. [前提・依存](#前提依存)
5. [導入方法](#導入方法)
6. [ライセンス](#ライセンス)
7. [クレジット](#クレジット)

## 概要

リアルタイムプレビュー、自動保存、Markdownファイルの読み込み・保存に対応した軽量なブラウザ用エディターです。編集とMarkdownの変換は端末内で行います。

[Playgroundはこちら！](https://tools.oz-coden.com/markdown-editor/)

## 開発背景

専用エディターのインストールや文書のアップロードをせずに、Markdownの執筆と確認をひとつの画面で行うことを目的としています。静的ファイルで構成し、変換・無害化ライブラリと共通UIを同梱しています。

## 機能

- 見出し、強調、取り消し線、引用、リスト、リンク、画像、表、チェックリスト、コードブロックのリアルタイムプレビュー。
- 分割・編集のみ・プレビューのみの表示切り替え。小さい画面では分割時に上下へ並びます。
- UTF-8ファイルの読み込みとドラッグ＆ドロップ、ファイル名を指定したMarkdown保存、クリップボードへのコピー。
- ブラウザ内への自動保存と復元、サンプル、確認付きの置き換え・リセット。
- 書式挿入ボタンとショートカット。**Ctrl / ⌘ + S**で保存、**Ctrl / ⌘ + B**で太字、**Ctrl / ⌘ + I**で斜体。
- プレビューを含む共通ライト・ダークテーマ。
- HTMLの無害化とsandboxで分離したプレビュー。Markdownの変換は停止可能なWeb Workerで実行します。

### 対応記法と制限

MarkedのGitHub Flavored Markdownモードを使います。見た目はGitHub風ですが、GitHubの表示を完全に再現するものではありません。GitHub独自のアラート、脚注、見出しへの自動アンカー、数式、Mermaid、コードの色分けには対応していません。単一の改行は通常のMarkdownの段落規則で扱います。段落を分けるには空行を、明示的に改行するには行末にスペースを2つ入れてください。

`details`・`summary`・`kbd`など、安全なHTML要素を表示できます。スクリプト、埋め込みフレーム、スタイル、フォーム、イベントハンドラーは除去します。チェックリストは表示専用です。HTTP(S)・`mailto:`の絶対URLのリンクは別に開きます。相対リンクとフラグメントリンクは、移動できないテキストとして表示します。

プレビューの上限は**20万UTF-16コード単位**で、変換に2.5秒以上かかる場合は停止します。超過しても元の内容は編集・保存できます。ファイル読み込みは**1 MiB以下のUTF-8ファイルを1つずつ**受け付け、同じ文字数上限を適用します。UTF-8のBOMは読み込み時に除去し、改行はエディター内でLFにそろえます。不正なUTF-8は読み込まず、現在の内容を保持します。

## 前提・依存

- JavaScriptが有効な最新版（安定版）のWebブラウザ。

画面の言語は日本語です。ファイル保存とクリップボードへのアクセスは、ブラウザや端末に依存します。Web Workerを使うため、`index.html`を`file://`で直接開くのではなく、HTTP(S)サーバー経由で利用してください。

実行に必要なライブラリは`vendor/`へ同梱しています。Markdown変換にはMarked 18.1.1、HTMLの無害化にはDOMPurify 3.4.17、スタイル・ナビゲーション・テーマにはoz-coden.com-ui-webを利用します。共通UIの版は`shared-ui.json`に記録しています。

## 導入方法

1. リポジトリをクローンまたはダウンロードし、フォルダ構成を保ちます。
2. リポジトリのルートで静的HTTPサーバーを起動します。Python 3を使う場合は、次を実行します。

   ```sh
   python -m http.server 8000
   ```

3. ブラウザで`http://localhost:8000/`を開きます。

アプリの利用には静的HTML・CSS・JavaScriptだけを使います。Node.js、依存パッケージのインストール、ビルド、APIサーバーは不要です。

### 使い方

1. サンプルを編集するか、**ファイルを開く**またはペインへのドラッグ＆ドロップで読み込みます。現在の内容が空でない場合は、置き換えの確認が表示されます。
2. **Markdown**欄へ入力し、プレビューで表示を確認します。書式ボタンは選択した文字列に適用され、未選択の場合は雛形を挿入します。
3. **分割**・**編集**・**プレビュー**で表示を切り替えます。
4. ファイル名を設定し、**Markdownを保存**または**Ctrl / ⌘ + S**で保存します。**コピー**はMarkdownの原文をコピーします。
5. **リセット**で入力と自動保存を空の文書に、**サンプル**でサンプル文書に置き換えます。空でない文書の置き換えには確認が必要です。

### プライバシーとブラウザ内保存

Markdown、ファイルの内容、ファイル名をアップロードする処理はありません。アクセス解析・APIサービス・外部CDNは使いません。外部画像は初期状態では読み込みません。**外部画像を読み込む**を有効にすると、HTTP(S)の絶対URLの画像をリファラーなしで取得し、その画像サーバーへ通信します。PNG・JPEG・GIF・WebPの埋め込みデータURLは通信せずに表示できます。相対パスの画像は解決せず、Markdownファイルの読み込みによって隣接する画像ファイルへアクセスできるようにはなりません。リンクを開くと通常どおり移動先へアクセスします。

文書とファイル名は、このオリジンの`localStorage`に`oz_markdown_editor_v1`というキーで保存します。外部画像の設定は再読み込み時に復元しません。プライベートブラウジング、ストレージの無効化・容量不足、ブラウザデータの削除などで保存・復元できない場合があります。保存に失敗した場合は画面に表示し、ファイル保存は引き続き利用できます。別タブで保存が更新された場合、このタブの入力は保持し、自動保存を停止して他方のデータを保護します。必要な内容をファイルに保存してから再読み込みしてください。自動保存はバックアップではありません。

### 開発と公開

Node.js 22以降で次を実行します。

```sh
npm ci
npm run check
npx playwright install --with-deps --only-shell chromium
npm test
```

ブラウザの自動検査はChromiumで実施します。ほかのブラウザエンジンは自動検査の対象に含めていません。

処理とレイアウトは`script.js`・`preview.js`・`parser-worker.js`・`style.css`で管理します。依存ライブラリを更新する場合は`package.json`の版を変更して`npm install`と`npm run vendor`を実行し、ロックファイル、`vendor/`、`vendor-manifest.json`をコミットします。マニフェストには版とSHA-256ハッシュを記録し、ファイル検査で照合します。

共通UIを更新する場合は、同じ親フォルダに共通UIリポジトリをクローンし、このアプリのルートで`node ../oz-coden.com-ui-web/scripts/sync-ui.mjs . COMMIT_SHA`を実行します。`COMMIT_SHA`は取り込む版の40桁のコミットSHAに置き換え、`vendor/ui/`と`shared-ui.json`をまとめてコミットしてください。

公開用ファイルは[tools.oz-coden.com](https://github.com/oz-coden/tools.oz-coden.com)で組み立てて配信します。公開処理では共通UIを更新し、専用のブラウザ検査を実施してから公開します。

## ライセンス

This project is released under the [MIT License](LICENSE). Bundled third-party components retain their own licenses: [Marked](vendor/marked/LICENSE), [DOMPurify (Apache 2.0)](vendor/dompurify/LICENSE), [DOMPurify (MPL 2.0)](vendor/dompurify/LICENSE-MPL.txt) and [shared UI](vendor/ui/LICENSE).

## クレジット

- Markdown変換：[Marked](https://github.com/markedjs/marked)。
- HTMLの無害化：[DOMPurify](https://github.com/cure53/DOMPurify)。
- 共通スタイル・ナビゲーション・テーマ：[oz-coden.com-ui-web](https://github.com/oz-coden/oz-coden.com-ui-web)。
