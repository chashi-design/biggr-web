#!/usr/bin/env node

/**
 * Fetch and cache embeddable YouTube exercise videos.
 *
 * Usage:
 *   YOUTUBE_API_KEY=... node scripts/update-youtube-videos.js
 *   YOUTUBE_API_KEY=... node scripts/update-youtube-videos.js --language ja --limit 50
 *   YOUTUBE_API_KEY=... node scripts/update-youtube-videos.js --slug barbell-bench-press --refresh
 *   YOUTUBE_API_KEY=... node scripts/update-youtube-videos.js --muscle-group chest --exclude-slug barbell-bench-press
 *   YOUTUBE_API_KEY=... node scripts/update-youtube-videos.js --slug hip-adduction-machine --language ja --query 'ヒップアダクション フォーム|内転マシン やり方'
 *
 * Search results are cached in data/youtube-videos.json. The API key is never
 * written to disk or to generated HTML.
 */

const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..");
const EXERCISES_PATH = path.join(ROOT_DIR, "data", "exercises.json");
const CACHE_PATH = path.join(ROOT_DIR, "data", "youtube-videos.json");
const API_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_RESULTS = 50;

function parseArgs(argv) {
  const options = {
    language: "all",
    slug: "",
    muscleGroup: "",
    query: "",
    excludedSlugs: new Set(),
    limit: Number.POSITIVE_INFINITY,
    refresh: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--language") options.language = argv[++index] || "all";
    else if (arg === "--slug") options.slug = argv[++index] || "";
    else if (arg === "--muscle-group") options.muscleGroup = argv[++index] || "";
    else if (arg === "--query") options.query = argv[++index] || "";
    else if (arg === "--exclude-slug") options.excludedSlugs.add(argv[++index] || "");
    else if (arg === "--limit") options.limit = Number.parseInt(argv[++index], 10);
    else if (arg === "--refresh") options.refresh = true;
    else throw new Error(`Unknown option: ${arg}`);
  }

  if (!["all", "ja", "en"].includes(options.language)) {
    throw new Error("--language must be ja, en, or all");
  }
  if ((options.limit !== Number.POSITIVE_INFINITY && !Number.isFinite(options.limit)) || options.limit <= 0) {
    throw new Error("--limit must be a positive number");
  }
  return options;
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function youtubeRequest(endpoint, params, apiKey) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  Object.entries({ ...params, key: apiKey }).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube API ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json();
}

function parseDurationSeconds(duration) {
  const match = String(duration || "").match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!match) return null;
  return Number(match[1] || 0) * 86400 +
    Number(match[2] || 0) * 3600 +
    Number(match[3] || 0) * 60 +
    Number(match[4] || 0);
}

function searchConfig(exercise, language) {
  if (language === "ja") {
    return {
      q: `${exercise.name} やり方 フォーム`,
      relevanceLanguage: "ja",
      regionCode: "JP"
    };
  }
  return {
    q: `${exercise.nameEn} form tutorial`,
    relevanceLanguage: "en",
    regionCode: "US"
  };
}

async function fetchVideos(exercise, language, apiKey, queryOverride = "") {
  const config = searchConfig(exercise, language);
  if (queryOverride) config.q = queryOverride;
  const search = await youtubeRequest(
    "search",
    {
      part: "snippet",
      type: "video",
      maxResults: MAX_RESULTS,
      order: "relevance",
      safeSearch: "moderate",
      videoEmbeddable: "true",
      videoSyndicated: "true",
      ...config
    },
    apiKey
  );

  const ids = search.items.map((item) => item.id && item.id.videoId).filter(Boolean);
  if (ids.length === 0) return [];

  const details = await youtubeRequest(
    "videos",
    { part: "snippet,statistics,status,contentDetails", id: ids.join(",") },
    apiKey
  );
  const detailsById = new Map(details.items.map((item) => [item.id, item]));

  return ids
    .map((id) => detailsById.get(id))
    .filter(Boolean)
    .filter((item) => item.status && item.status.embeddable && item.status.privacyStatus === "public")
    .map((item) => ({
      videoId: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl:
        (item.snippet.thumbnails.medium && item.snippet.thumbnails.medium.url) ||
        (item.snippet.thumbnails.default && item.snippet.thumbnails.default.url) ||
        `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`,
      viewCount: Number.parseInt(item.statistics.viewCount || "0", 10),
      publishedAt: item.snippet.publishedAt,
      durationSeconds: parseDurationSeconds(item.contentDetails && item.contentDetails.duration)
    }));
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("Set YOUTUBE_API_KEY before running this script.");

  const options = parseArgs(process.argv.slice(2));
  const exercises = await readJson(EXERCISES_PATH, []);
  const cache = await readJson(CACHE_PATH, {});
  const languages = options.language === "all" ? ["ja", "en"] : [options.language];
  let updated = 0;

  for (const exercise of exercises) {
    const slug = exercise.slug || slugify(exercise.nameEn) || exercise.id;
    if (options.slug && slug !== options.slug) continue;
    if (options.muscleGroup && exercise.muscleGroup !== options.muscleGroup) continue;
    if (options.excludedSlugs.has(slug)) continue;

    cache[slug] = cache[slug] || {};
    for (const language of languages) {
      if (updated >= options.limit) break;
      if (!options.refresh && Array.isArray(cache[slug][language]) && cache[slug][language].length > 0) continue;

      const previousOrientations = new Map(
        (Array.isArray(cache[slug][language]) ? cache[slug][language] : [])
          .filter((video) => video && ["portrait", "non-portrait"].includes(video.orientation))
          .map((video) => [video.videoId, video.orientation])
      );
      cache[slug][language] = (await fetchVideos(exercise, language, apiKey, options.query)).map((video) => ({
        ...video,
        orientation: previousOrientations.get(video.videoId) || "unknown"
      }));
      cache[slug].updatedAt = new Date().toISOString();
      await fs.writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
      updated += 1;
      console.log(`[youtube] ${slug} (${language}): ${cache[slug][language].length} videos`);
    }
    if (updated >= options.limit) break;
  }

  console.log(`[youtube] Updated ${updated} exercise/language entries.`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
