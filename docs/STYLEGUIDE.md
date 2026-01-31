# CSS Style Guide

## 目的
- 見通しの良いCSS構成を維持し、追加・修正時の品質を安定させる。

## ファイル構成の順序
1. Tokens（CSS変数）
2. Base（リセット/タグ/全体）
3. Layout（共通レイアウト）
4. Components（各UI）
5. Media queries（レスポンシブ）

## セレクタの並び
- 近い要素は近くに置く（例: `.hero` → `.hero-content` → `.hero-title`）
- 同じ役割のセクションは塊でまとめる
- 追加時は該当セクションに寄せる

## プロパティ順
以下の順で並べる。

1. Position
   - position, inset, top/right/bottom/left, z-index
2. Layout
   - display, flex*, grid*, align*, justify*, gap
3. Sizing
   - width, height, min/max, aspect-ratio
4. Spacing
   - margin*, padding*
5. Typography
   - font*, line-height, text*, white-space
6. Color / Background
   - color, background*
7. Border
   - border*, border-radius
8. Effects
   - box-shadow, opacity, transform, transition, filter, backdrop-filter
9. Misc
   - box-sizing, object-fit, cursor, content, outline*

## ルール
- 1プロパティ=1行
- 不要な空行を増やしすぎない
- `:root` で定義した変数を優先的に使う
- 既存コンポーネントは同じ命名規則を踏襲する

