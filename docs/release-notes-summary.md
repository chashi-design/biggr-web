# 変更内容まとめ（リリースノート/画像/ファビコン）

## 目的
- リリースノートページの新設
- 高解像度端末向け画像（@2x/@3x）の対応
- ファビコンと Web App Manifest の設定

## 実施内容

### 1) リリースノートページの追加
- 日本語/英語のリリースノートページを新規作成
  - `docs/ja/releasenotes.html`
  - `docs/en/releasenotes.html`
- 最新の更新（Version 1.0.0 / 2026-01-27）を掲載
- フッターに「リリースノート」リンクを追加
  - `docs/ja/index.html`, `docs/en/index.html`
  - `docs/ja/faq.html`, `docs/en/faq.html`
  - `docs/ja/privacypolicy.html`, `docs/en/privacypolicy.html`
  - `docs/ja/terms.html`, `docs/en/terms.html`
  - `docs/ja/licenses.html`, `docs/en/licenses.html`
- サイトマップに追加
  - `docs/sitemap.xml`

### 2) 高解像度画像（@2x / @3x）の対応
- 主要画像（hero / features / download）に `srcset` を追加
  - `docs/ja/index.html`
  - `docs/en/index.html`
- `@2x` / `@3x` 画像を生成
  - `docs/assets/hero/*@2x.png`, `docs/assets/hero/*@3x.png`
  - `docs/assets/features/*@2x.png`, `docs/assets/features/*@3x.png`
  - `docs/assets/download/*@2x.png`, `docs/assets/download/*@3x.png`

※ 生成した @2x/@3x は元画像を拡大したものです。より鮮明にする場合は、元データから書き出した高解像度画像への差し替えを推奨します。

### 3) ファビコン / Web App Manifest
- ファビコン画像を生成
  - `docs/assets/favicon/apple-touch-icon.png`（180x180）
  - `docs/assets/favicon/favicon-32.png`（32x32）
  - `docs/assets/favicon/favicon-16.png`（16x16）
- Web App Manifest を追加
  - `docs/site.webmanifest`
  - `docs/assets/favicon/icon-192.png`
  - `docs/assets/favicon/icon-512.png`
- 各ページに以下を追加
  - `<link rel="apple-touch-icon" ...>`
  - `<link rel="icon" ...>`
  - `<link rel="manifest" ...>`

## 補足
- 画像はユーザー側で差し替え予定。
- 必要であれば `favicon.ico` の追加も可能。

