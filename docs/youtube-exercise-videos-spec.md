# 種目別YouTube動画 仕様

更新日: 2026-10-10

## 目的

Biggrの種目詳細ページで、各種目のフォーム確認に使えるYouTube動画をページ内に表示する。

## 対象

- データ元: `data/exercises.json`
- 現在の登録数: 128種目
- 部位別内訳:
  - 脚: 39
  - 肩: 21
  - 腕: 18
  - 背中: 18
  - 胸: 14
  - 腹筋: 10
  - 有酸素: 8
- 対象ページ: `/ja/exercises/<slug>/` と `/en/exercises/<slug>/`

## 表示仕様

- 通常動画セクション、YouTubeショートセクションの順で、動作方法セクションの直前に配置する。
- Shortsのサムネイル枠は9:16の縦長にする。通常動画は16:9のままにする。
- Shorts一覧は画面幅962px以上で5列、604〜961pxで3列、603px以下で2列にする。小さい画面では横はみ出しを避けるためカード幅を縮める。
- SNS参考動画セクションは種目詳細ページに表示しない。
- 日本語ページでは日本語動画を、英語ページでは英語動画を優先する。
- 初期表示は10件。`もっと見る`を押すたびに10件追加する。
- キャッシュ済み動画をすべて表示した後、種目・言語に対応するキーワードでYouTube検索へ移動する「YouTubeでさらに見る」リンクを表示する。動画が10件以下の場合は初期表示時点で表示する。
- 並び順はYouTube APIの検索関連度順（`order=relevance`）。
- 日本語の再生回数は9,999回までは現在の桁区切り表示を維持し、10,000回以上は万・億単位の整数に切り捨てて表示する。
- 表示例: `9,999 回視聴`、`1万 回視聴`、`15万 回視聴`、`86万 回視聴`、`1億 回視聴`。
- 英語ページの再生回数表示は現状の桁区切り表示を維持する。
- 動画はユーザーが再生ボタンを押した時にYouTube埋め込みプレーヤーへ切り替える。初期表示ではサムネイルを使い、不要なiframe読込を避ける。
- 埋め込みは `youtube-nocookie.com` を使う。
- 検索結果がない場合も動画セクションを表示し、YouTube検索へのリンクを案内する。
- 動画が再生できない場合に備えて、タイトルからYouTubeの動画ページへ移動できるリンクを残す。
- 動画一覧の上に説明文（検索関連度順、Shortsの長さ・縦型判定など）は表示しない。通常動画・Shortsともに日本語／英語、全種目で統一する。
- 「【SGIR公式】切り抜きfitness」チャンネルの動画は、通常動画・Shortsの両方で表示しない。

## 検索方針

- API検索は、種目ごと・言語ごとに1回行う。
- 日本語クエリの基本形は「種目名 フォーム」または「種目名 やり方」。
- `data/exercises.json` の `aliases` から、日本語で意味が明確な別名を最大2つまで候補に加える。
- OR候補はYouTube Data APIの `q` に `|` で連結する。候補を増やしても1リクエスト内なら検索枠の消費は1回。
- 例: `ベンチプレス フォーム|ベンチプレス やり方|BBベンチ フォーム|BBベンチ やり方`
- 英語の別名は日本語クエリに含めない。
- 「ベンチ」「デッド」など曖昧な別名は、無関係な動画を増やすため採用しない。
- 検索時に動画形式を指定し、埋め込み可能・外部再生可能な動画を優先する。
- 現行実装のYouTube API検索順位は `order=relevance`。詳細情報取得後も検索結果の順番を維持し、再生回数では並べ替えない。

### OR検索の注意

YouTube Data APIの `search.list` は `q` 内の `|` をOR演算子として扱う。`URLSearchParams` を使えばパイプ文字はリクエストURL用にエンコードされる。検索語は種目と関係のある同義語に絞り、広すぎる候補を加えない。

### Shorts判定に関するAPI仕様

- YouTube Data APIには動画を「Shorts」として直接判定する検索フィルターがない。
- `type=video` は検索対象を動画リソースにする指定であり、「通常動画」の意味ではない。`videoType` の選択肢は `any` / `episode` / `movie` で、Shortsの選択肢はない。
- `videoDuration=short` は4分未満を意味し、今回の上限3分とは一致しない。
- 参考: [YouTube検索API](https://developers.google.com/youtube/v3/docs/search/list)

## YouTubeショート専用セクション

### 希望する表示

- 種目詳細ページに通常動画とは別の「YouTubeショート」セクションを設ける。
- ショート枠の上限は再生時間3分（180秒）以内とする。暫定ルールとして、60秒以下の動画は縦横比を確認せずShorts欄に掲載する。
- 3分以内でタイトルに `#Shorts` または `#ショート` が含まれる動画も、向きを確認せずShorts欄に掲載する。
- 条件に合う動画は通常の「YouTube動画」セクションから除外し、ショート側だけに表示する。

### YouTube Data APIで取得できる情報の制約

- 公開動画の `videos.list` から `contentDetails.duration` を取得できるため、3分以内かどうかは自動判定できる。
- 取得スクリプトは動画詳細APIの既存リクエストに `contentDetails` を加え、秒数を `durationSeconds` としてキャッシュする。APIリクエスト数は増えない。
- 実動画の幅・高さ・アスペクト比は `fileDetails.videoStreams` にあるが、YouTube公式仕様では `fileDetails` はその動画の所有者だけが取得できる。公開動画を検索するBiggrのAPIキーでは取得できない。
- `contentDetails.dimension` は2D/3Dの区別であり、縦型/横型ではない。サムネイルの寸法も元動画の縦横比を保証しない。
- このため、公開APIだけで「3分以内かつ縦型」を完全自動判定することはできない。

### 振り分け・手動確認フロー

- 60秒以下の動画は縦横比にかかわらずショート欄だけに表示する（暫定ルール）。
- タイトルに `#Shorts` または `#ショート` が含まれる3分以内の動画は、向き判定より優先してショート欄だけに表示する。
- 61〜180秒で `orientation: "portrait"` の動画はショート欄だけに表示する。
- 61〜180秒で `orientation: "non-portrait"`（横型または正方形）の動画は通常欄に表示する。
- 61〜180秒で向きが未確認の動画、および長さ未取得の旧キャッシュは、誤分類を避けるため両方の欄に表示しない。
- 3分を超える動画は通常欄に表示する。
- 取得キャッシュ内の `orientation` は `unknown` で開始する。動画ページで向きを目視確認して `portrait` または `non-portrait` に設定する。
- 手動確認用スクリプト: `scripts/review-youtube-short-candidates.js`。既定では61〜180秒の一意な動画IDを最大50件ずつ確認し、同じ動画が複数の種目・言語に出る場合は一度の判定を共有する。60秒以下とタイトルに `#Shorts` または `#ショート` が含まれる動画は確認対象から除外する。`--slug` と `--language ja|en` で対象を絞れる。
- 判定後に `node scripts/generate-exercise-pages.js` を実行してページへ反映する。再取得時も同じvideo IDの向き判定は保持する。
- 上記のハッシュタグ条件を除き、タイトルのShorts表記などの自動推定は縦型判定に使わない。
- YouTube自体は2024年10月15日以降の正方形または縦型動画について3分までShortsとして分類する。Biggrではユーザー指定により、正方形ではなく縦型のみをShorts欄に掲載する。参考: [YouTubeの3分Shortsに関するヘルプ](https://support.google.com/youtube/answer/15424877?hl=ja)
- 参考: [Videosリソースと fileDetails の所有者制限](https://developers.google.com/youtube/v3/docs/videos)

## API枠と所要日数の目安

- 公式の標準枠では `search.list` は専用枠で1日100回。
- `videos.list` は通常枠を1リクエストあたり1ユニット消費する。
- 現在の取得スクリプトは検索結果をまとめて `videos.list` で取得するため、1種目・1言語につき検索1回と動画詳細1回が基本。
- 日本語のみ128種目: 検索128回。未使用枠から開始する場合、最短2日。
- 日本語・英語の両方を128種目: 検索256回。未使用枠から開始する場合、最短3日。
- 上記は他のAPI利用がなく、各種目で検索リクエストが成功する前提の概算。日次リセット時刻はPacific Time。
- 公式仕様: https://developers.google.com/youtube/v3/determine_quota_cost
- 検索API仕様: https://developers.google.com/youtube/v3/docs/search/list

## 現在の実装

- 取得スクリプト: `scripts/update-youtube-videos.js`
- 検索結果が0件の種目は、`--query` で別語やOR検索語を指定して、その種目だけ再検索できる。
- キャッシュ: `data/youtube-videos.json`
- ページ生成: `scripts/generate-exercise-pages.js`
- 表示用スクリプト: `docs/js/exercise-videos.js`
- 非表示チャンネルは `scripts/generate-exercise-pages.js` の表示データ正規化時に除外する。元キャッシュは保持し、将来のページ再生成でも表示されないようにする。
- APIキーは `YOUTUBE_API_KEY` 環境変数から読み込み、HTMLやキャッシュJSONに保存しない。
- 取得後にページを再生成する。

ショート情報を取得・確認・反映する:

```bash
YOUTUBE_API_KEY="$YOUTUBE_API_KEY" node scripts/update-youtube-videos.js --slug barbell-bench-press --language ja --refresh
node scripts/review-youtube-short-candidates.js --slug barbell-bench-press --language ja
node scripts/generate-exercise-pages.js
```

Shorts候補の向きは動画IDごとに確認し、同じ動画が複数種目・言語で検索された場合は判定を共有する。候補が多いため、確認スクリプトは一度に最大50件を表示する。種目・言語を省略するとキャッシュ全体から確認する。

```bash
node scripts/review-youtube-short-candidates.js --limit 50
node scripts/generate-exercise-pages.js
```

ベンチプレス以外の胸の種目を日本語・英語で取得する:

```bash
node scripts/update-youtube-videos.js --muscle-group chest --exclude-slug barbell-bench-press
node scripts/generate-exercise-pages.js
```

取得スクリプトは `YOUTUBE_API_KEY` 環境変数を使う。未設定なら先にシェルで設定し、APIキーをチャットやソースに貼らない。既存の種目・言語キャッシュはスキップし、未取得分だけ検索する。

## Google Cloud認証の選択

YouTube Data API v3の認証情報作成画面では、アクセスするデータの種類として「一般公開データ」を選択する。

- Biggrが検索するのはYouTube上で一般公開されている動画と、その公開メタデータ（タイトル、チャンネル、サムネイル、再生回数など）。
- ユーザーのGoogle/YouTubeアカウント、非公開動画、個人の再生リストや評価などにはアクセスしない。
- 一般公開データへのAPIリクエストにはAPIキーを使う。ユーザー本人の同意を得るOAuth 2.0は不要。
- 「ユーザーデータ」を選ぶOAuth認証は、ユーザーのアカウント情報や非公開データをユーザーの許可を得て扱う機能が必要な場合に限る。今回選ぶと不要な認証設定と同意フローが増える。
- APIキーは公開情報ではない。引き続き環境変数で管理し、ソースコードや生成HTMLに書かない。
- 公式説明: [YouTube Data APIの認証情報](https://developers.google.com/youtube/registering_an_application)、[OAuth 2.0認証](https://developers.google.com/youtube/v3/guides/authentication)

### APIキーの制限

- **APIの制限**は「キーを制限」を選び、`YouTube Data API v3` のみに制限する。
- **アプリケーションの制限**は、キーを使うクライアントに合わせる。現在はMac上のNode.js取得スクリプトが呼び出し元。
- ウェブサイト制限（HTTP referrer）はブラウザーからのAPI呼び出し向けであり、Mac上のNode.jsスクリプトには適さない。
- Macの外向きグローバルIPアドレスが固定されている場合は「IPアドレス」で制限できる。IPが変動する回線では、IP制限により次回の取得が失敗するため、固定IPを確認するまではアプリケーション制限を「なし」にして、API制限と環境変数管理を必須とする。
- 取得処理を将来サーバーへ移す場合は、そのサーバーの固定IPで再制限する。ブラウザーから直接呼び出す構成にはAPIキーを置かない。
- Google Cloudは、可能な場合にクライアント制限とAPI制限の両方を推奨している。現在のローカル実行では固定IPが確認できた場合に両方を有効にする。
- 公式説明: [APIキーの制限](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys)

```bash
YOUTUBE_API_KEY="$YOUTUBE_API_KEY" node scripts/update-youtube-videos.js --language ja --limit 100
node scripts/generate-exercise-pages.js
```

検索枠リセット後に同じ取得コマンドを再実行すると、すでにキャッシュされた種目はスキップされる。英語は `--language en` を指定する。`--language` を省略すると日本語・英語の両方が対象になる。

## 実装状況・次の作業

- 動画セクション、10件表示、追加表示、遅延iframe埋め込み、空データ時と一覧末尾のYouTube検索リンクは実装済み。
- YouTube検索結果をキャッシュして種目ページへ反映する仕組みは実装済み。
- Shortsの上限は3分。60秒以下またはタイトルに `#Shorts` / `#ショート` を含む3分以内の動画は縦横比の確認なしでShorts欄へ表示する。その他の61〜180秒は向き判定が未確認の間、両方の欄に表示しない。
- 2026-10-10時点のキャッシュは128種目中14種目（27種目・言語エントリー）。残りの種目動画を表示するにはYouTube APIでの取得が必要。
- 全128種目のAPI取得と公開ページへの反映は、APIキーと検索枠を確認して実行する。
- 日本語別名を使ったOR検索は仕様案。現行の取得スクリプトは種目名に「やり方 フォーム」を付ける方式で、OR別名候補の組み立ては未反映。
- 並び順を `relevance` に変更した場合、既存キャッシュは以前の `viewCount` 順の結果なので、`--refresh` で対象を再取得してからページを再生成する。
- 検索結果は埋め込み可否を確認しているが、動画投稿者による削除・公開範囲変更・年齢/地域制限などにより、後日再生できなくなる可能性がある。

## 今後の仕様記録

Biggr Webの機能仕様・運用方針を会話で整理した場合は、原則としてこのMarkdownまたは関連するMarkdown文書にも反映する。
