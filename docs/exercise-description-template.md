# 種目説明テンプレート（日本語）

## 目的
- `/ja/exercises/{slug}/` の情報量と文体を一定に保つためのテンプレート。
- `data/exercises.json`（基本情報）と `data/exercise-detail-ja.json`（補助情報）を分離して管理する。

## 入力データの分担
- 基本情報（必須）: `data/exercises.json`
  - `id`, `name`, `nameEn`, `muscleGroup`, `aliases`, `equipment`, `trackingType`, `pattern`, `descJa`
  - `trackingType` の推奨値: `weightReps`, `repsOnly`, `durationOnly`, `distanceOnly`
  - `pattern` の推奨値: `horizontal_push`, `vertical_push`, `vertical_pull`, `horizontal_pull`, `squat`, `hinge`, `lunge`, `elbow_flexion`, `elbow_extension`, `anti_rotation` など
- 補助情報（任意だが推奨）: `data/exercise-detail-ja.json`
  - `primaryMuscles`, `secondaryMuscles`, `repGuide`, `howToSteps`, `formPoints`, `tips`, `socialLinks`, `youtubeUrl`, `seoTitle`, `seoDescription`, `relatedExerciseIds`

## 補助情報テンプレート（JSON）
```json
{
  "exXXX": {
    "primaryMuscles": ["主働筋1", "主働筋2"],
    "secondaryMuscles": ["補助筋1", "補助筋2"],
    "repGuide": {
      "strength": "1〜5回",
      "hypertrophy": "6〜12回",
      "endurance": "13〜20回"
    },
    "howToSteps": [
      "手順1",
      "手順2",
      "手順3"
    ],
    "formPoints": [
      "フォームの要点1",
      "フォームの要点2"
    ],
    "tips": [
      "実践のコツ1",
      "実践のコツ2"
    ],
    "socialLinks": {
      "youtube": {
        "url": "https://www.youtube.com/watch?v=xxxx",
        "title": "フォーム解説"
      },
      "tiktok": {
        "url": "https://www.tiktok.com/@account/video/1234567890",
        "title": "TikTokでフォーム確認"
      },
      "instagram": {
        "url": "https://www.instagram.com/reel/ABCDEFGHIJK/",
        "title": "Instagramでフォーム確認"
      }
    },
    "youtubeUrl": "https://www.youtube.com/results?search_query=...",
    "youtubeTitle": "YouTubeでフォームを見る",
    "seoTitle": "{種目名}とは？鍛えられる部位・器具・やり方の基本 | Biggr",
    "seoDescription": "{種目名}の基本をわかりやすく紹介。鍛えられる部位、使用器具、回数目安、フォーム確認用の動画リンクを掲載。筋トレ記録アプリ Biggr。",
    "relatedExerciseIds": ["ex001", "ex002", "ex003"]
  }
}
```

## コピー作成ルール
- 1文を短くする。
- 断定しすぎない（回数は「目安」として表現する）。
- 1セクション1メッセージに絞る。
- 「どこに効くか」「回数」「やり方」「フォーム」「コツ」をH2単位で分ける。

## フォールバック仕様
- `primaryMuscles` 未設定: `muscleGroup` の日本語ラベルを表示。
- `repGuide` 未設定: 共通テンプレート（筋力アップ / 筋肥大 / 持久力アップ）を表示。
- `howToSteps` 未設定: `pattern` ベースの定型3ステップを表示。
- `formPoints` / `tips` 未設定: 種目タイプ別の共通文を表示。
- `socialLinks.youtube` 未設定: `youtubeUrl`（後方互換）を優先し、未設定なら種目名ベースのYouTube検索リンクを表示。
- `socialLinks.tiktok` 未設定: 種目名ベースのTikTok検索リンクを表示。
- `socialLinks.instagram` 未設定: 種目名ベースのInstagram検索リンクを表示。

## 運用メモ
- 新規種目を追加したら `scripts/generate-exercise-pages.js` を実行してHTMLを再生成する。
- 生成後は `docs/sitemap.xml` が更新されるため、差分を必ず確認する。
- 種目IDを再採番した場合は、`data/exercise-detail-ja.json` のキー（`exXXX`）が一致しているか必ず確認する。
