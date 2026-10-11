#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");

const CACHE_PATH = path.resolve(__dirname, "..", "data", "youtube-videos.json");
const SHORT_MAX_DURATION_SECONDS = 180;
const AUTO_SHORT_MAX_DURATION_SECONDS = 60;
const HIDDEN_CHANNEL_TITLES = new Set(["【SGIR公式】切り抜きfitness"]);
const SHORTS_TITLE_PATTERN = /(?:#shorts\b|#ショート)/i;

function parseArgs(argv) {
  const options = { slug: "", language: "all", limit: 50 };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--slug") options.slug = argv[++index] || "";
    else if (argv[index] === "--language") options.language = argv[++index] || "all";
    else if (argv[index] === "--limit") options.limit = Number.parseInt(argv[++index], 10);
    else throw new Error(`Unknown option: ${argv[index]}`);
  }
  if (!["all", "ja", "en"].includes(options.language)) {
    throw new Error("--language must be ja, en, or all");
  }
  if (!Number.isInteger(options.limit) || options.limit <= 0) {
    throw new Error("--limit must be a positive number");
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cache = JSON.parse(await fs.readFile(CACHE_PATH, "utf8"));
  const videosById = new Map();

  for (const [slug, entry] of Object.entries(cache)) {
    for (const language of ["ja", "en"]) {
      for (const video of Array.isArray(entry[language]) ? entry[language] : []) {
        if (
          !Number.isFinite(video.durationSeconds) ||
          video.durationSeconds <= AUTO_SHORT_MAX_DURATION_SECONDS ||
          video.durationSeconds > SHORT_MAX_DURATION_SECONDS ||
          HIDDEN_CHANNEL_TITLES.has(String(video.channelTitle || "").trim()) ||
          SHORTS_TITLE_PATTERN.test(String(video.title || ""))
        ) continue;
        const candidate = videosById.get(video.videoId) || { video, refs: [] };
        candidate.refs.push({ slug, language, video });
        videosById.set(video.videoId, candidate);
      }
    }
  }

  const unclassified = [...videosById.values()].filter((candidate) => {
    const known = new Set(candidate.refs.map((ref) => ref.video.orientation).filter((value) => ["portrait", "non-portrait"].includes(value)));
    if (known.size === 1) {
      const orientation = [...known][0];
      for (const ref of candidate.refs) ref.video.orientation = orientation;
      return false;
    }
    const inScope = candidate.refs.some(
      (ref) => (!options.slug || ref.slug === options.slug) && (options.language === "all" || ref.language === options.language)
    );
    return inScope;
  });
  const candidates = unclassified.slice(0, options.limit);

  if (candidates.length === 0) {
    console.log("未確認の61〜180秒候補はありません。先に動画を取得してください。");
    return;
  }

  console.log(`未確認の61〜180秒動画: ${unclassified.length}件。今回は最大${options.limit}件を確認します。`);

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    for (const [index, candidate] of candidates.entries()) {
      const { video } = candidate;
      const ref = candidate.refs.find(
        (item) => (!options.slug || item.slug === options.slug) && (options.language === "all" || item.language === options.language)
      ) || candidate.refs[0];
      const { slug, language } = ref;
      console.log(`\n${index + 1}/${candidates.length} [${language}] ${slug} (${video.durationSeconds}秒)`);
      console.log(video.title);
      console.log(`https://www.youtube.com/watch?v=${video.videoId}`);
      console.log(`同じ動画を使う種目・言語の候補: ${candidate.refs.length}件`);
      const answer = (await rl.question("縦型=p / 縦型ではない（横型・正方形）=n / 保留=Enter: "))
        .trim()
        .toLowerCase();
      if (answer === "p" || answer === "n") {
        const orientation = answer === "p" ? "portrait" : "non-portrait";
        for (const item of candidate.refs) item.video.orientation = orientation;
        await fs.writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
      }
    }
  } finally {
    rl.close();
  }

  console.log("判定を保存しました。残りの確認を続けるには同じコマンドを再実行してください。");
  console.log("ページへ反映するには scripts/generate-exercise-pages.js を実行してください。");
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
