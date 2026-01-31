# Biggr SEO 方針・対応メモ

## 目的
- biggrapp.com の日本語 / 英語ページを正しくインデックスさせる
- アプリの主題（筋トレ記録 / workout log）を検索意図に沿って明確化する
- 余計な重複評価を避け、静的サイトの強み（軽量・高速）を活かす

## 前提
- 公開ルート: `docs/`
- 配信: GitHub Pages + Cloudflare
- 言語: 日本語 `/ja/` / 英語 `/en/`

## 基本方針
1) **言語ごとに独立したURL** を持ち、`hreflang` と `canonical` で重複を回避
2) **title / H1 / 冒頭文** で主題と検索キーワードを明確化
3) **sitemap / robots** で主要ページを明示
4) **構造化データ**（SoftwareApplication）でアプリ情報を補足
5) **静的・軽量設計**を維持し、LCP を悪化させない

## 対応済み（現状）

### 1) robots / sitemap
- `docs/robots.txt`
  - `User-agent: *` / `Allow: /`
  - `Sitemap: https://biggrapp.com/sitemap.xml`
- `docs/sitemap.xml`
  - 収録: `/`, `/ja/`, `/en/`
  - 既存の主要ページ: `faq.html` / `terms.html` / `privacypolicy.html` / `licenses.html`（ja/en 両方）

### 2) /ja/ の On-page SEO
- `<title>`: 「筋トレ記録アプリ」+ `Biggr`
- `<meta name="description">`: 記録の手軽さ / カレンダー / 履歴 / iCloud を要約
- `<h1>`: 「筋トレ記録アプリ Biggr」
- JSON-LD（SoftwareApplication）
  - `price: 0` / `priceCurrency: JPY`

### 3) /en/ の On-page SEO
- `<title>`: “Workout Log App …” + `Biggr`
- `<meta name="description">`: log in seconds / calendar view / one-tap history / iCloud sync
- `<h1>`: 英語圏の主題（workout log app）
- JSON-LD（SoftwareApplication）
  - `price: 0` / `priceCurrency: USD`

## 要確認 / 未対応
- **/en/ の canonical / hreflang が未反映**
  - `/ja/` には `canonical` と `hreflang` を実装済み
  - `/en/` にも同一構成で追加する必要がある（重複回避のため）
- **柱記事 `/ja/strength-training-app/` が未作成**
  - 作成後に `docs/sitemap.xml` へ追加
- **App Store のURL確定後の反映**
  - JSON-LD の `downloadUrl` とページ内リンクを更新

## 運用ルール
- 新規ページ追加時は **必ず `docs/sitemap.xml` を更新**
- ページ更新時は **`changefreq` を更新**（更新頻度に合わせて見直す）
- サイト更新時は **該当URLの `lastmod` を更新**
- 言語追加時は **全ページの `hreflang` を更新**
- 価格/配信情報の変更時は **JSON-LD の `offers` を更新**

## 検証チェック
- `https://biggrapp.com/robots.txt` / `https://biggrapp.com/sitemap.xml` が 200
- Google リッチリザルトテストで JSON-LD がエラーにならない
- Search Console で sitemap 登録とインデックス状況を確認
