#!/usr/bin/env node

/**
 * Generate static exercise list/detail pages for Japanese SEO content.
 *
 * Data source:
 * - data/exercises.json (base exercise fields)
 * - data/exercise-detail-ja.json (optional detail overrides)
 *
 * Output:
 * - docs/ja/exercises/index.html
 * - docs/ja/exercises/{slug}/index.html
 * - docs/sitemap.xml (append /ja/exercises URLs)
 */

const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const DOCS_DIR = path.join(ROOT_DIR, "docs");
const JA_EXERCISES_DIR = path.join(DOCS_DIR, "ja", "exercises");
const EN_EXERCISES_DIR = path.join(DOCS_DIR, "en", "exercises");
const EXERCISE_IMAGE_DIR = path.join(DOCS_DIR, "assets", "exercises");
const PLACEHOLDER_EXERCISE_IMAGE_PATH = path.join(EXERCISE_IMAGE_DIR, "climbmill.png");
const SITEMAP_PATH = path.join(DOCS_DIR, "sitemap.xml");

const BASE_URL = "https://biggrapp.com";
const APP_STORE_URL = "https://apps.apple.com/app/id6758259008";
const TODAY = new Date().toISOString().slice(0, 10);

const LAT_PULLDOWN_SLUG = "lat-pulldown";
const LAT_PULLDOWN_REDIRECT_SLUGS = [
  "lat-pulldown-wide-grip",
  "lat-pulldown-mag-grip-medium-grip-neutral",
  "lat-pulldown-mag-grip-medium-grip-pronated",
  "lat-pulldown-mag-grip-medium-grip-supinated",
  "lat-pulldown-mag-grip-close-grip-neutral",
  "lat-pulldown-mag-grip-close-grip-pronated",
  "lat-pulldown-mag-grip-close-grip-supinated",
  "lat-pulldown-wide-parallel-grip",
  "lat-pulldown-mag-grip-wide-grip",
  "straight-arm-pulldown"
];

const LAT_PULLDOWN_VARIATIONS_JA = [
  { name: "ワイドグリップ", description: "広めに握り、背中の広がりを意識しやすい形です。" },
  { name: "パラレルグリップ", description: "手のひらを向かい合わせて握り、肩まわりを動かしやすい形です。" },
  { name: "MAGグリップ", description: "ミディアムやクローズなど、握り幅と向きを変えて調整できます。" },
  { name: "ストレートアーム", description: "肘を大きく曲げずに引き、広背筋の動きを確認しやすい形です。" }
];

const LAT_PULLDOWN_VARIATIONS_EN = [
  { name: "Wide grip", description: "A wider grip that makes it easier to focus on back width." },
  { name: "Parallel grip", description: "A neutral grip that can feel easier around the shoulders." },
  { name: "MAG grip", description: "Use medium or close handles to adjust grip width and hand position." },
  { name: "Straight-arm", description: "Keep the elbows nearly fixed to feel the lats through the pull." }
];

const MUSCLE_GROUP_ORDER = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "cardio",
  "abs",
  "full_body",
  "other"
];

const MUSCLE_GROUP_LABELS = {
  chest: "胸",
  back: "背中",
  shoulders: "肩",
  arms: "腕",
  legs: "脚",
  cardio: "有酸素",
  abs: "腹筋",
  full_body: "全身",
  other: "その他"
};

const MUSCLE_GROUP_LABELS_EN = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  legs: "Legs",
  cardio: "Cardio",
  abs: "Abs",
  full_body: "Full body",
  other: "Other"
};

const EQUIPMENT_LABELS = {
  barbell: "バーベル",
  dumbbell: "ダンベル",
  machine: "マシン",
  cable: "ケーブル",
  smith: "スミスマシン",
  kettlebell: "ケトルベル",
  device: "器具",
  bodyweight: "自重",
  plate: "プレート",
  water: "水中",
  unknown: "その他",
  nil: "その他"
};

const EQUIPMENT_LABELS_EN = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine",
  cable: "Cable",
  smith: "Smith machine",
  kettlebell: "Kettlebell",
  device: "Device",
  bodyweight: "Bodyweight",
  plate: "Plate",
  water: "Water",
  unknown: "Other",
  nil: "Other"
};

const EQUIPMENT_LABEL_ORDER = [
  "バーベル",
  "ダンベル",
  "マシン",
  "ケーブル",
  "スミスマシン",
  "ケトルベル",
  "器具",
  "自重",
  "プレート",
  "水中",
  "その他"
];

const EQUIPMENT_LABEL_ORDER_EN = [
  "Barbell",
  "Dumbbell",
  "Machine",
  "Cable",
  "Smith machine",
  "Kettlebell",
  "Device",
  "Bodyweight",
  "Plate",
  "Water",
  "Other"
];

const TRACKING_TYPE_LABELS = {
  weightReps: "重量・回数",
  repsOnly: "回数",
  durationOnly: "時間",
  distanceOnly: "距離",
  weight_reps: "重量・回数",
  reps_only: "回数",
  time: "時間",
  distance_time: "距離・時間"
};

const DEFAULT_REP_GUIDE_REPS = {
  strength: "1〜5回",
  hypertrophy: "6〜12回",
  endurance: "13〜20回"
};

const DEFAULT_REP_GUIDE_TIME = {
  strength: "高強度 20〜60秒",
  hypertrophy: "中強度 10〜20分",
  endurance: "低〜中強度 20〜60分"
};

const PATTERN_ALIASES = {
  // Push families
  push: "push",
  horizontal_push: "push",
  vertical_push: "push",
  diagonal_push: "push",
  squat_press: "push",
  // Pull families
  pull: "pull",
  row: "row",
  horizontal_pull: "row",
  vertical_pull: "pull",
  // Lower-body families
  hinge: "hinge",
  hip_extension: "hinge",
  squat: "squat",
  lunge: "squat",
  knee_extension: "squat",
  knee_flexion: "squat",
  ankle_plantarflexion: "squat",
  hip_abduction: "isolation",
  hip_adduction: "isolation",
  // Arm isolation families
  curl: "curl",
  elbow_flexion: "curl",
  extension: "extension",
  elbow_extension: "extension",
  wrist_flexion: "isolation",
  wrist_extension: "isolation",
  grip: "isolation",
  // Shoulder isolation
  abduction: "isolation",
  flexion: "isolation",
  // Core families
  core: "core",
  spine_flexion: "core",
  spine_extension: "core",
  hip_flexion: "core",
  anti_extension: "core",
  anti_lateral_flexion: "core",
  anti_rotation: "core",
  rotation: "core",
  // Conditioning
  cardio: "cardio",
  cardio_run: "cardio",
  cardio_cycle: "cardio",
  cardio_elliptical: "cardio",
  cardio_climb: "cardio",
  cardio_step: "cardio",
  cardio_swim: "cardio",
  explosive: "cardio",
  // Fallback
  isolation: "isolation",
  mobility: "mobility"
};

const HOW_TO_BY_PATTERN = {
  push: [
    "安定した姿勢を作り、肩と体幹を固定する",
    "狙う部位を意識して、反動を使わずに押す",
    "可動域を保ちながら、ゆっくり元に戻す"
  ],
  pull: [
    "胸を軽く張り、肩を下げて構える",
    "肘を引く意識で、狙う部位に負荷を乗せる",
    "戻し動作もコントロールして、負荷を抜かない"
  ],
  row: [
    "体幹を安定させ、背中が丸まらない姿勢を作る",
    "肘を後方へ引き、肩甲骨を寄せる",
    "勢いを使わず、ゆっくり戻す"
  ],
  hinge: [
    "背中を中立に保ち、股関節から動き始める",
    "もも裏の張りを感じる位置まで下ろす",
    "足裏で床を押して立ち上がる"
  ],
  squat: [
    "足幅を決め、体幹を固める",
    "股関節と膝を同時に曲げて下ろす",
    "足裏全体で床を押して立ち上がる"
  ],
  isolation: [
    "対象部位の力を抜かずに構える",
    "反動を使わず、可動域を丁寧に使う",
    "戻し動作をゆっくり行う"
  ],
  curl: [
    "肘の位置を固定して構える",
    "肘を軸にして持ち上げる",
    "ゆっくり下ろして負荷を保つ"
  ],
  extension: [
    "肘を固定し、肩の力みを減らす",
    "狙う部位で押し切る",
    "可動域を保って戻す"
  ],
  core: [
    "体幹を固定して姿勢を整える",
    "反動を使わず、腹部の収縮を感じる",
    "呼吸を止めずに動作する"
  ],
  cardio: [
    "ウォームアップで心拍を段階的に上げる",
    "目的に合わせてペースを設定する",
    "終了後はクールダウンで整える"
  ],
  mobility: [
    "呼吸を整え、関節を大きく動かす",
    "痛みのない範囲で可動域を広げる",
    "左右差を確認しながら反復する"
  ]
};

const FORM_POINTS_BY_PATTERN = {
  push: ["肩をすくめない", "手首を寝かせすぎない", "反動を使いすぎない"],
  pull: ["腰を反りすぎない", "肩が前に出ないようにする", "勢いで引かない"],
  row: ["背中を丸めない", "首に力を入れすぎない", "戻しを速くしすぎない"],
  hinge: ["背中を丸めない", "膝を伸ばしきらない", "バーや重りを体から離しすぎない"],
  squat: ["膝とつま先の向きをそろえる", "胸を落としすぎない", "かかとを浮かせない"],
  isolation: ["可動域を急に狭めない", "対象部位の緊張を保つ"],
  curl: ["肘を前後に振りすぎない", "手首を反らしすぎない"],
  extension: ["肘を開きすぎない", "肩をすくめない"],
  core: ["腰を反らしすぎない", "首に力を入れすぎない"],
  cardio: ["呼吸を止めない", "開始直後に追い込みすぎない"],
  mobility: ["痛みがある角度を避ける", "勢いだけで動かさない"]
};

const TIPS_BY_MUSCLE_GROUP = {
  chest: [
    "最初は可動域を優先してフォームを固める",
    "肩に違和感がある日は重量を落として調整する"
  ],
  back: [
    "腕ではなく背中で引く感覚を優先する",
    "反動が増えたら重量を一段下げる"
  ],
  shoulders: [
    "重量よりも肩の軌道を安定させる",
    "首まわりの力みを減らして行う"
  ],
  arms: [
    "肘の位置を固定すると狙った部位に効きやすい",
    "回数を急がず、下ろし動作を丁寧に行う"
  ],
  legs: [
    "ウォームアップで股関節と足首を動かす",
    "高重量の日はセーフティ設定を確認する"
  ],
  cardio: [
    "体調に合わせて時間や強度を調整する",
    "ペースより継続を優先する"
  ],
  abs: [
    "回数よりも体幹の安定を優先する",
    "腰に違和感がある場合は可動域を調整する"
  ],
  full_body: [
    "強度が高い日はセット間の休憩を長めに取る",
    "動作が崩れたら回数を減らして調整する"
  ],
  other: [
    "痛みがある場合は中止してフォームを見直す",
    "無理なく続けられる負荷設定を選ぶ"
  ]
};

const PLACEHOLDER_BG_BY_MUSCLE_GROUP = {
  chest: "#c2410c",
  back: "#0f766e",
  shoulders: "#1d4ed8",
  arms: "#7c3aed",
  legs: "#047857",
  cardio: "#b91c1c",
  abs: "#0891b2",
  full_body: "#374151",
  other: "#334155"
};

const PLACEHOLDER_ACCENT_BY_MUSCLE_GROUP = {
  chest: "#fb923c",
  back: "#2dd4bf",
  shoulders: "#60a5fa",
  arms: "#a78bfa",
  legs: "#34d399",
  cardio: "#f87171",
  abs: "#22d3ee",
  full_body: "#9ca3af",
  other: "#94a3b8"
};

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeSlugSegment(input) {
  return input
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function resolveSlug(exercise, usedSlugs) {
  const baseFromEn = sanitizeSlugSegment(exercise.nameEn || "");
  const baseFromJa = sanitizeSlugSegment(exercise.name || "");
  const base = baseFromEn || baseFromJa || `exercise-${sanitizeSlugSegment(exercise.id || "")}`;
  const safeBase = base || `exercise-${sanitizeSlugSegment(exercise.id || "unknown")}`;

  let slug = safeBase;
  if (usedSlugs.has(slug)) {
    slug = `${safeBase}-${sanitizeSlugSegment(exercise.id || "id")}`;
  }

  let suffix = 2;
  while (usedSlugs.has(slug)) {
    slug = `${safeBase}-${suffix}`;
    suffix += 1;
  }

  usedSlugs.add(slug);
  return slug;
}

function normalizeAliases(aliases) {
  if (!aliases) {
    return [];
  }
  if (Array.isArray(aliases)) {
    return aliases.filter(Boolean).map((value) => String(value).trim()).filter(Boolean);
  }
  if (typeof aliases === "string") {
    return aliases
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeExercise(rawExercise, slug) {
  return {
    ...rawExercise,
    slug,
    aliases: normalizeAliases(rawExercise.aliases),
    muscleGroup: rawExercise.muscleGroup || "other",
    equipment: rawExercise.equipment || "unknown",
    pattern: rawExercise.pattern || "isolation",
    trackingType: rawExercise.trackingType || "weight_reps",
    descJa: (rawExercise.descJa || "").trim(),
    name: rawExercise.name || rawExercise.nameEn || rawExercise.id,
    nameEn: rawExercise.nameEn || rawExercise.name || rawExercise.id
  };
}

function toPatternFamily(pattern) {
  return PATTERN_ALIASES[pattern] || "isolation";
}

function toListExerciseImageSrc(exercise) {
  return `../../assets/exercises/${exercise.slug}.png`;
}

function toDetailExerciseImageSrc(exercise) {
  return `../../../assets/exercises/${exercise.slug}.png`;
}

function splitTitleLines(text, maxChars = 14) {
  const chars = Array.from(String(text || "").trim());
  if (chars.length <= maxChars) {
    return [chars.join("")];
  }
  if (chars.length <= maxChars * 2) {
    return [chars.slice(0, maxChars).join(""), chars.slice(maxChars).join("")];
  }
  return [chars.slice(0, maxChars).join(""), `${chars.slice(maxChars, maxChars * 2 - 1).join("")}…`];
}

function buildExercisePlaceholderSvg(exercise) {
  const bg = PLACEHOLDER_BG_BY_MUSCLE_GROUP[exercise.muscleGroup] || PLACEHOLDER_BG_BY_MUSCLE_GROUP.other;
  const accent = PLACEHOLDER_ACCENT_BY_MUSCLE_GROUP[exercise.muscleGroup] || PLACEHOLDER_ACCENT_BY_MUSCLE_GROUP.other;
  const muscleLabel = mapLabel(MUSCLE_GROUP_LABELS, exercise.muscleGroup, "その他");
  const [line1, line2] = splitTitleLines(exercise.name);
  const secondLine = line2
    ? `<text x="72" y="716" fill="#ffffff" font-size="56" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-weight="700">${escapeHtml(
        line2
      )}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-labelledby="title">
  <title id="title">${escapeHtml(exercise.name)} ダミー画像</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <circle cx="1010" cy="160" r="180" fill="#ffffff20"/>
  <rect x="64" y="64" width="220" height="72" rx="18" fill="#ffffff1f"/>
  <text x="92" y="112" fill="#ffffff" font-size="34" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-weight="700">Biggr</text>
  <text x="72" y="192" fill="#ffffff" font-size="34" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" opacity="0.92">${escapeHtml(
    muscleLabel
  )}</text>
  <g fill="#ffffff" opacity="0.95">
    <rect x="410" y="362" width="380" height="28" rx="14"/>
    <rect x="404" y="326" width="42" height="100" rx="12"/>
    <rect x="754" y="326" width="42" height="100" rx="12"/>
    <rect x="356" y="316" width="38" height="120" rx="12"/>
    <rect x="806" y="316" width="38" height="120" rx="12"/>
  </g>
  <text x="72" y="642" fill="#ffffff" font-size="62" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-weight="800">${escapeHtml(
    line1
  )}</text>
  ${secondLine}
</svg>
`;
}

async function ensureExercisePlaceholderImages(exercises) {
  await fs.mkdir(EXERCISE_IMAGE_DIR, { recursive: true });
  await fs.access(PLACEHOLDER_EXERCISE_IMAGE_PATH);

  let createdCount = 0;
  for (const exercise of exercises) {
    const filePath = path.join(EXERCISE_IMAGE_DIR, `${exercise.slug}.png`);
    try {
      await fs.access(filePath);
      continue;
    } catch {
      // missing file: create a placeholder
    }

    // Reuse the shared placeholder image so generated pages stay aligned with the current PNG-based asset set.
    await fs.copyFile(PLACEHOLDER_EXERCISE_IMAGE_PATH, filePath);
    createdCount += 1;
  }

  return createdCount;
}

function mapLabel(map, key, fallback) {
  return map[key] || fallback;
}

function buildRepGuide(exercise, repGuideFromDetail) {
  if (repGuideFromDetail && repGuideFromDetail.strength && repGuideFromDetail.hypertrophy && repGuideFromDetail.endurance) {
    return repGuideFromDetail;
  }

  if (
    exercise.trackingType === "time" ||
    exercise.trackingType === "distance_time" ||
    exercise.trackingType === "durationOnly" ||
    exercise.trackingType === "distanceOnly"
  ) {
    return DEFAULT_REP_GUIDE_TIME;
  }

  return DEFAULT_REP_GUIDE_REPS;
}

function sortEquipmentLabels(labels, order = EQUIPMENT_LABEL_ORDER, locale = "ja") {
  return labels.slice().sort((a, b) => {
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);
    const scoreA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
    const scoreB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    return a.localeCompare(b, locale);
  });
}

function buildHowToSteps(exercise, detailSteps) {
  if (Array.isArray(detailSteps) && detailSteps.length >= 3) {
    return detailSteps.slice(0, 5);
  }
  const patternFamily = toPatternFamily(exercise.pattern);
  return HOW_TO_BY_PATTERN[patternFamily] || HOW_TO_BY_PATTERN.isolation;
}

function buildFormPoints(exercise, detailPoints) {
  if (Array.isArray(detailPoints) && detailPoints.length > 0) {
    return detailPoints.slice(0, 6);
  }
  const patternFamily = toPatternFamily(exercise.pattern);
  return FORM_POINTS_BY_PATTERN[patternFamily] || FORM_POINTS_BY_PATTERN.isolation;
}

function buildTips(exercise, detailTips) {
  if (Array.isArray(detailTips) && detailTips.length > 0) {
    return detailTips.slice(0, 5);
  }
  return TIPS_BY_MUSCLE_GROUP[exercise.muscleGroup] || TIPS_BY_MUSCLE_GROUP.other;
}

function buildLeadText(exercise) {
  if (exercise.descJa) {
    return exercise.descJa;
  }

  const muscleLabel = mapLabel(MUSCLE_GROUP_LABELS, exercise.muscleGroup, "その他");
  return `${exercise.name}は、${muscleLabel}を中心に取り入れやすい種目です。無理のない負荷設定でフォームを確認しながら継続してください。`;
}

function buildSeoTitle(exercise, detail) {
  if (detail && detail.seoTitle) {
    return detail.seoTitle;
  }
  return `${exercise.name}とは？鍛えられる部位・器具・やり方の基本 | Biggr`;
}

function buildSeoDescription(exercise, detail, equipmentLabel) {
  if (detail && detail.seoDescription) {
    return detail.seoDescription;
  }
  return `${exercise.name}の基本をわかりやすく紹介。鍛えられる部位、使用器具（${equipmentLabel}）、回数目安、フォーム確認用の動画リンクを掲載。筋トレ記録アプリ Biggr。`;
}

function isLatPulldown(exercise) {
  return exercise.slug === LAT_PULLDOWN_SLUG;
}

function renderLatPulldownVariations() {
  return `<section class="section exercise-detail-section" id="variations">
          <h2 class="exercise-detail-heading">バリエーション</h2>
          <ul class="form-points-list">
            ${LAT_PULLDOWN_VARIATIONS_JA.map(
              (variation) => `<li><strong>${escapeHtml(variation.name)}</strong> ${escapeHtml(variation.description)}</li>`
            ).join("\n            ")}
          </ul>
        </section>`;
}

function renderLatPulldownVariationsEn() {
  return `<section class="section exercise-detail-section" id="variations">
          <h2 class="exercise-detail-heading">Variations</h2>
          <ul class="form-points-list">
            ${LAT_PULLDOWN_VARIATIONS_EN.map(
              (variation) => `<li><strong>${escapeHtml(variation.name)}</strong> ${escapeHtml(variation.description)}</li>`
            ).join("\n            ")}
          </ul>
        </section>`;
}

function displayAliasesForDetail(exercise) {
  if (isLatPulldown(exercise)) {
    return ["プルダウン", "ラットプル", "ワイドプルダウン", "ストレートアームプルダウン"];
  }
  return normalizeAliases(exercise.aliases);
}

function displayAliasesForDetailEn(exercise) {
  if (isLatPulldown(exercise)) {
    return ["Pulldown", "Wide grip lat pulldown", "MAG grip lat pulldown", "Straight-arm pulldown"];
  }
  return normalizeAliases(exercise.aliases);
}

function sanitizeHttpUrl(value) {
  if (typeof value !== "string") {
    return "";
  }
  const url = value.trim();
  if (!url) {
    return "";
  }
  return /^https?:\/\//i.test(url) ? url : "";
}

function toYoutubeSearchUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function normalizeSocialLink(input, fallbackKey) {
  if (typeof input === "string") {
    return {
      url: sanitizeHttpUrl(input),
      title: ""
    };
  }

  if (input && typeof input === "object") {
    return {
      url: sanitizeHttpUrl(input.url || input[`${fallbackKey}Url`]),
      title: typeof input.title === "string" ? input.title.trim() : ""
    };
  }

  return { url: "", title: "" };
}

function buildSocialLinks(exercise, detail) {
  // `socialLinks` を優先しつつ、既存の `youtubeUrl` / `youtubeTitle` も後方互換で扱う。
  const socialMap = detail && detail.socialLinks && typeof detail.socialLinks === "object" ? detail.socialLinks : {};

  const youtubeSource = normalizeSocialLink(socialMap.youtube || detail.youtubeUrl, "youtube");

  const normalizedYoutubeTitle =
    youtubeSource.title || (typeof detail.youtubeTitle === "string" ? detail.youtubeTitle.trim() : "") || `${exercise.name}のフォーム動画`;

  return [
    {
      platform: "youtube",
      label: "YouTube",
      iconUrl: "../../../assets/sns/youtube.svg",
      title: normalizedYoutubeTitle,
      url: youtubeSource.url || toYoutubeSearchUrl(exercise.name),
      ctaLabel: "YouTubeで見る"
    }
  ];
}

function buildRelatedExercises(allExercises, current, detail) {
  const byId = new Map(allExercises.map((exercise) => [exercise.id, exercise]));

  // 補助データに関連IDがある場合はそれを優先する。
  if (detail && Array.isArray(detail.relatedExerciseIds) && detail.relatedExerciseIds.length > 0) {
    const resolved = detail.relatedExerciseIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .filter((exercise) => exercise.id !== current.id);

    if (resolved.length >= 3) {
      return resolved.slice(0, 6);
    }
  }

  const bucket = [];
  for (const target of allExercises) {
    if (target.id === current.id) {
      continue;
    }

    let score = 0;
    if (target.muscleGroup === current.muscleGroup) {
      score += 100;
    }
    if (target.pattern === current.pattern) {
      score += 10;
    }
    if (target.equipment === current.equipment) {
      score += 1;
    }

    if (score > 0) {
      bucket.push({ target, score });
    }
  }

  bucket.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.target.name.localeCompare(b.target.name, "ja");
  });

  const related = bucket.map((item) => item.target);
  const uniqueIds = new Set();
  const uniqueRelated = [];
  for (const item of related) {
    if (uniqueIds.has(item.id)) {
      continue;
    }
    uniqueIds.add(item.id);
    uniqueRelated.push(item);
  }

  if (uniqueRelated.length < 3) {
    const sortedAll = allExercises
      .filter((exercise) => exercise.id !== current.id)
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));

    for (const candidate of sortedAll) {
      if (uniqueIds.has(candidate.id)) {
        continue;
      }
      uniqueIds.add(candidate.id);
      uniqueRelated.push(candidate);
      if (uniqueRelated.length >= 6) {
        break;
      }
    }
  }

  return uniqueRelated.slice(0, 6);
}

function buildListStructuredData(exercises) {
  const itemList = exercises
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ja"))
    .map((exercise, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${BASE_URL}/ja/exercises/${exercise.slug}/`,
      name: exercise.name
    }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "筋トレ種目一覧 | 部位別に探せるトレーニング種目集 | Biggr",
        description:
          "Biggrの筋トレ種目一覧ページです。胸・背中・脚など部位別に種目を探し、やり方や回数の目安を確認できます。",
        inLanguage: "ja",
        url: `${BASE_URL}/ja/exercises/`
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Biggr",
            item: `${BASE_URL}/ja/`
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "筋トレ種目一覧",
            item: `${BASE_URL}/ja/exercises/`
          }
        ]
      },
      {
        "@type": "ItemList",
        name: "Biggr 筋トレ種目一覧",
        itemListElement: itemList
      }
    ]
  };
}

function buildListStructuredDataEn(exercises) {
  const itemList = exercises
    .slice()
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn, "en"))
    .map((exercise, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${BASE_URL}/en/exercises/${exercise.slug}/`,
      name: exercise.nameEn
    }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Exercise Library | Find Workouts by Muscle Group | Biggr",
        description: "Browse workouts in Biggr by muscle group. Check muscles worked, rep guidance, and form basics.",
        inLanguage: "en",
        url: `${BASE_URL}/en/exercises/`
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Biggr",
            item: `${BASE_URL}/en/`
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Exercise Library",
            item: `${BASE_URL}/en/exercises/`
          }
        ]
      },
      {
        "@type": "ItemList",
        name: "Biggr Exercise Library",
        itemListElement: itemList
      }
    ]
  };
}

function buildDetailStructuredData(exercise, seoDescription) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: exercise.name,
        description: seoDescription,
        inLanguage: "ja",
        url: `${BASE_URL}/ja/exercises/${exercise.slug}/`
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Biggr",
            item: `${BASE_URL}/ja/`
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "筋トレ種目一覧",
            item: `${BASE_URL}/ja/exercises/`
          },
          {
            "@type": "ListItem",
            position: 3,
            name: exercise.name,
            item: `${BASE_URL}/ja/exercises/${exercise.slug}/`
          }
        ]
      }
    ]
  };
}

function renderDownloadPanel(assetPrefix) {
  return `<div class="download-panel">
        <div class="section-header">
          <h2 class="section-title">アプリを入手</h2>
          <p class="section-lead"><span class="copy-line">筋トレや</span><span class="copy-line">トレーニングの</span><span class="copy-line">記録は</span><span class="copy-line">Biggrに</span><span class="copy-line">お任せください。</span><span class="copy-line">今すぐ無料で</span><span class="copy-line">使い始められます。</span></p>
        </div>
        <div class="download-media">
          <picture>
            <source srcset="${assetPrefix}/download/download-ja-dark.png 1x, ${assetPrefix}/download/download-ja-dark@2x.png 2x, ${assetPrefix}/download/download-ja-dark@3x.png 3x" media="(prefers-color-scheme: dark)">
            <img src="${assetPrefix}/download/download-ja-light.png" srcset="${assetPrefix}/download/download-ja-light.png 1x, ${assetPrefix}/download/download-ja-light@2x.png 2x, ${assetPrefix}/download/download-ja-light@3x.png 3x" alt="Biggrのダウンロード案内">
          </picture>
        </div>
        <div class="download-actions">
          <a class="app-store-link" href="${APP_STORE_URL}">
            <img
              class="app-store-badge"
              src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
              alt="App Storeからダウンロード">
          </a>
        </div>
      </div>`;
}

function renderDownloadPanelEn(assetPrefix) {
  return `<div class="download-panel">
        <div class="section-header">
          <h2 class="section-title">Get the app</h2>
          <p class="section-lead"><span class="copy-line">Log your training</span><span class="copy-line">and workouts</span><span class="copy-line">in Biggr.</span><span class="copy-line">Start for free</span><span class="copy-line">right now.</span></p>
        </div>
        <div class="download-media">
          <picture>
            <source srcset="${assetPrefix}/download/download-en-dark.png 1x, ${assetPrefix}/download/download-en-dark@2x.png 2x, ${assetPrefix}/download/download-en-dark@3x.png 3x" media="(prefers-color-scheme: dark)">
            <img src="${assetPrefix}/download/download-en-light.png" srcset="${assetPrefix}/download/download-en-light.png 1x, ${assetPrefix}/download/download-en-light@2x.png 2x, ${assetPrefix}/download/download-en-light@3x.png 3x" alt="Biggr download preview">
          </picture>
        </div>
        <div class="download-actions">
          <a class="app-store-link" href="${APP_STORE_URL}">
            <img
              class="app-store-badge"
              src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
              alt="Download on the App Store">
          </a>
        </div>
      </div>`;
}

function listPageHtml(exercises, categories) {
  const defaultCategory = categories[0] || "chest";
  const categoryNav = categories
    .map((category, index) => {
      const isActive = index === 0;
      return `<a class="exercise-tab${isActive ? " is-active" : ""}" href="#category-${category}" data-category="${category}" role="tab" aria-selected="${isActive ? "true" : "false"}">${escapeHtml(
        mapLabel(MUSCLE_GROUP_LABELS, category, "その他")
      )}</a>`;
    })
    .join("\n          ");

  const categorySections = categories
    .map((category, index) => {
      const items = exercises.filter((exercise) => exercise.muscleGroup === category);

      const sorted = items.sort((a, b) => a.name.localeCompare(b.name, "ja"));
      const bucketByEquipment = new Map();
      for (const exercise of sorted) {
        const equipmentLabel = mapLabel(EQUIPMENT_LABELS, exercise.equipment, "その他");
        if (!bucketByEquipment.has(equipmentLabel)) {
          bucketByEquipment.set(equipmentLabel, []);
        }
        bucketByEquipment.get(equipmentLabel).push(exercise);
      }

      const equipmentSectionHtml = sortEquipmentLabels(Array.from(bucketByEquipment.keys()))
        .map((equipmentLabel) => {
          const cards = bucketByEquipment
            .get(equipmentLabel)
            .map((exercise) => {
              const aliases = exercise.aliases.join(" ");
              const imageSrc = toListExerciseImageSrc(exercise);
              const muscleGroupLabel = mapLabel(MUSCLE_GROUP_LABELS, exercise.muscleGroup, "その他");

              return `
                <a class="exercise-card" href="./${escapeHtml(exercise.slug)}/" data-name="${escapeHtml(
                  exercise.name
                )} ${escapeHtml(exercise.nameEn)}" data-aliases="${escapeHtml(aliases)}" data-muscle-group="${escapeHtml(
                  muscleGroupLabel
                )}">
                  <div class="exercise-card-media">
                    <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(exercise.name)}の種目イメージ" class="exercise-card-image" loading="lazy" decoding="async">
                  </div>
                  <h3 class="exercise-card-title">${escapeHtml(exercise.name)}</h3>
                  <p class="exercise-card-meta">${escapeHtml(muscleGroupLabel)}</p>
                </a>`;
            })
            .join("\n");

          return `
          <section class="exercise-equipment-group" data-equipment-group="${escapeHtml(equipmentLabel)}">
            <h3 class="exercise-equipment-title">${escapeHtml(equipmentLabel)}</h3>
            <div class="exercise-card-grid">
${cards}
            </div>
          </section>`;
        })
        .join("\n");

      return `
      <section class="exercise-category${index === 0 ? " is-active" : ""}" id="category-${category}" data-category="${category}">
${equipmentSectionHtml}
      </section>`;
    })
    .join("\n");

  const structuredData = JSON.stringify(buildListStructuredData(exercises));

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>筋トレ種目一覧 | 部位別に探せるトレーニング種目集 | Biggr</title>
  <meta name="description" content="Biggrの筋トレ種目一覧ページです。胸・背中・脚など部位別に種目を探し、やり方や回数の目安を確認できます。">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta property="og:type" content="website">
  <meta property="og:title" content="筋トレ種目一覧 | Biggr">
  <meta property="og:description" content="部位別に探せる筋トレ種目一覧。各種目ページで部位・回数目安・やり方を確認できます。">
  <meta property="og:url" content="${BASE_URL}/ja/exercises/">
  <meta property="og:image" content="${BASE_URL}/assets/hero/hero-ja-light.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="apple-touch-icon" sizes="180x180" href="../../assets/favicon/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="../../assets/favicon/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="../../assets/favicon/favicon-16.png">
  <link rel="manifest" href="../../site.webmanifest">
  <link rel="canonical" href="${BASE_URL}/ja/exercises/">
  <link rel="alternate" hreflang="ja" href="${BASE_URL}/ja/exercises/">
  <link rel="alternate" hreflang="x-default" href="${BASE_URL}/ja/exercises/">
  <script>document.documentElement.classList.add("js-enabled");</script>
  <script type="application/ld+json">${structuredData}</script>
  <link rel="stylesheet" href="../../css/style.css">
</head>
<body class="exercise-list-page">
  <div class="container">
    <header class="app-header">
      <div class="app-header-inner">
        <a class="app-brand" href="../index.html">
          <img src="../../assets/app/app-icon.png" alt="Biggr app icon" class="app-icon">
          <span class="app-name">Biggr</span>
        </a>
        <a class="app-cta" href="${APP_STORE_URL}">App Storeで入手</a>
      </div>
    </header>

    <main class="main-content">
      <nav class="breadcrumb" aria-label="パンくず">
        <a href="../index.html">Biggr</a>
        <span aria-hidden="true">/</span>
        <span>筋トレ種目一覧</span>
      </nav>

      <section class="exercise-hero">
        <h1 class="exercise-page-title">筋トレ種目一覧</h1>
        <p class="exercise-page-lead">Biggrに登録されている種目を部位別に検索できます。やり方・フォームのポイントを確認できます。</p>
      </section>

      <section class="section exercise-browser" aria-labelledby="exercise-browser-title">
        <div class="section-header section-header-left">
          <h2 class="section-title" id="exercise-browser-title">部位から探す</h2>
        </div>

        <label class="exercise-search-label" for="exercise-search">種目を検索</label>
        <input class="exercise-search-input" id="exercise-search" type="search" placeholder="例: ベンチプレス / ダンベルカール / squat" autocomplete="off">

        <nav class="exercise-tabs" aria-label="部位カテゴリ" role="tablist">
          ${categoryNav}
        </nav>

        <p id="exercise-search-status" class="exercise-search-status" aria-live="polite"></p>

        ${categorySections}
      </section>

      <section class="section exercise-list-cta" id="download">
        ${renderDownloadPanel("../../assets")}
      </section>
    </main>

    <hr class="footer-divider">

    <footer class="site-footer">
      <div class="footer-content">
        <div class="footer-brand">
          <img src="../../assets/app/app-icon.png" alt="Biggr app icon" class="footer-icon">
          <div class="footer-lang">
            <p class="footer-title">言語</p>
            <select id="lang-select" class="footer-select" aria-label="言語" onchange="location.href=this.value;">
              <option value="./index.html" selected>日本語</option>
              <option value="../../en/index.html">English</option>
            </select>
          </div>
        </div>
        <div class="footer-column footer-about">
          <p class="footer-title">アプリについて</p>
          <div class="footer-list">
            <a href="${APP_STORE_URL}">App Storeで入手</a>
          </div>
        </div>
        <div class="footer-column footer-support">
          <p class="footer-title">サポート</p>
          <div class="footer-list">
            <a href="./index.html">筋トレ種目一覧</a>
            <a href="../faq.html">FAQ</a>
            <a href="../releasenotes.html">リリースノート</a>
            <a href="https://forms.gle/xawttwzNAxQLWsqz7" target="_blank" rel="noopener">お問い合わせ</a>
          </div>
        </div>
        <div class="footer-column footer-legal">
          <p class="footer-title">法的情報</p>
          <div class="footer-list">
            <a href="../privacypolicy.html">プライバシーポリシー</a>
            <a href="../terms.html">利用規約</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="footer-meta">© ${new Date().getFullYear()} Biggr App</p>
      </div>
    </footer>
  </div>

  <script>
    (function () {
      var tabs = Array.prototype.slice.call(document.querySelectorAll(".exercise-tab"));
      var sections = Array.prototype.slice.call(document.querySelectorAll(".exercise-category"));
      var searchInput = document.getElementById("exercise-search");
      var searchStatus = document.getElementById("exercise-search-status");

      function setActiveCategory(category) {
        tabs.forEach(function (tab) {
          var active = tab.dataset.category === category;
          tab.classList.toggle("is-active", active);
          tab.setAttribute("aria-selected", active ? "true" : "false");
        });

        sections.forEach(function (section) {
          section.classList.toggle("is-active", section.dataset.category === category);
        });
      }

      function getActiveCategory() {
        var activeTab = tabs.find(function (tab) {
          return tab.classList.contains("is-active");
        });
        if (activeTab) {
          return activeTab.dataset.category;
        }
        return sections.length > 0 ? sections[0].dataset.category : "${escapeHtml(defaultCategory)}";
      }

      function updateSearch() {
        var keyword = (searchInput.value || "").trim().toLowerCase();
        var visibleCount = 0;

        if (!keyword) {
          sections.forEach(function (section) {
            section.classList.remove("is-searching");
            section.hidden = false;
            Array.prototype.forEach.call(section.querySelectorAll(".exercise-equipment-group"), function (group) {
              group.hidden = false;
            });
            Array.prototype.forEach.call(section.querySelectorAll(".exercise-card"), function (card) {
              card.hidden = false;
            });
          });
          searchStatus.textContent = "";
          return;
        }

        var activeCategory = getActiveCategory();

        sections.forEach(function (section) {
          var isTargetSection = section.dataset.category === activeCategory;
          var sectionVisibleCount = 0;
          section.classList.add("is-searching");

          if (!isTargetSection) {
            section.hidden = true;
            section.classList.remove("is-active");
            return;
          }

          Array.prototype.forEach.call(section.querySelectorAll(".exercise-equipment-group"), function (group) {
            var groupVisibleCount = 0;

            Array.prototype.forEach.call(group.querySelectorAll(".exercise-card"), function (card) {
              var haystack = (card.dataset.name + " " + card.dataset.aliases + " " + card.dataset.muscleGroup).toLowerCase();
              var matched = haystack.indexOf(keyword) !== -1;
              card.hidden = !matched;
              if (matched) {
                groupVisibleCount += 1;
                sectionVisibleCount += 1;
                visibleCount += 1;
              }
            });

            group.hidden = groupVisibleCount === 0;
          });

          section.hidden = false;
          section.classList.add("is-active");
        });

        searchStatus.textContent = "検索結果: " + visibleCount + "件";
      }

      tabs.forEach(function (tab) {
        tab.addEventListener("click", function (event) {
          event.preventDefault();
          setActiveCategory(tab.dataset.category);
          history.replaceState(null, "", "#category-" + tab.dataset.category);
          updateSearch();
        });
      });

      if (searchInput) {
        searchInput.addEventListener("input", updateSearch);
      }

      var hash = window.location.hash.replace("#category-", "");
      var targetCategory = tabs.some(function (tab) {
        return tab.dataset.category === hash;
      })
        ? hash
        : "${escapeHtml(defaultCategory)}";

      setActiveCategory(targetCategory);
      updateSearch();
    })();
  </script>
</body>
</html>`;
}

function listPageHtmlEn(exercises, categories) {
  const defaultCategory = categories[0] || "chest";
  const categoryNav = categories
    .map((category, index) => {
      const isActive = index === 0;
      return `<a class="exercise-tab${isActive ? " is-active" : ""}" href="#category-${category}" data-category="${category}" role="tab" aria-selected="${isActive ? "true" : "false"}">${escapeHtml(
        mapLabel(MUSCLE_GROUP_LABELS_EN, category, "Other")
      )}</a>`;
    })
    .join("\n          ");

  const categorySections = categories
    .map((category, index) => {
      const items = exercises.filter((exercise) => exercise.muscleGroup === category);
      const sorted = items.sort((a, b) => a.nameEn.localeCompare(b.nameEn, "en"));
      const bucketByEquipment = new Map();
      for (const exercise of sorted) {
        const equipmentLabel = mapLabel(EQUIPMENT_LABELS_EN, exercise.equipment, "Other");
        if (!bucketByEquipment.has(equipmentLabel)) {
          bucketByEquipment.set(equipmentLabel, []);
        }
        bucketByEquipment.get(equipmentLabel).push(exercise);
      }

      const equipmentSectionHtml = sortEquipmentLabels(Array.from(bucketByEquipment.keys()), EQUIPMENT_LABEL_ORDER_EN, "en")
        .map((equipmentLabel) => {
          const cards = bucketByEquipment
            .get(equipmentLabel)
            .map((exercise) => {
              const aliases = exercise.aliases.join(" ");
              const imageSrc = toListExerciseImageSrc(exercise);
              const muscleGroupLabel = mapLabel(MUSCLE_GROUP_LABELS_EN, exercise.muscleGroup, "Other");

              return `
                <a class="exercise-card" href="./${escapeHtml(exercise.slug)}/" data-name="${escapeHtml(
                  exercise.name
                )} ${escapeHtml(exercise.nameEn)}" data-aliases="${escapeHtml(aliases)}" data-muscle-group="${escapeHtml(
                  muscleGroupLabel
                )}">
                  <div class="exercise-card-media">
                    <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(exercise.nameEn)} exercise image" class="exercise-card-image" loading="lazy" decoding="async">
                  </div>
                  <h3 class="exercise-card-title">${escapeHtml(exercise.nameEn)}</h3>
                  <p class="exercise-card-meta">${escapeHtml(muscleGroupLabel)}</p>
                </a>`;
            })
            .join("\n");

          return `
          <section class="exercise-equipment-group" data-equipment-group="${escapeHtml(equipmentLabel)}">
            <h3 class="exercise-equipment-title">${escapeHtml(equipmentLabel)}</h3>
            <div class="exercise-card-grid">
${cards}
            </div>
          </section>`;
        })
        .join("\n");

      return `
      <section class="exercise-category${index === 0 ? " is-active" : ""}" id="category-${category}" data-category="${category}">
${equipmentSectionHtml}
      </section>`;
    })
    .join("\n");

  const structuredData = JSON.stringify(buildListStructuredDataEn(exercises));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Exercise Library | Find Workouts by Muscle Group | Biggr</title>
  <meta name="description" content="Browse workouts in Biggr by muscle group. Check muscles worked, rep guidance, and form basics.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Exercise Library | Biggr">
  <meta property="og:description" content="Browse workouts by muscle group and open each exercise page for muscles worked, rep guidance, and basics.">
  <meta property="og:url" content="${BASE_URL}/en/exercises/">
  <meta property="og:image" content="${BASE_URL}/assets/hero/hero-en-light.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="apple-touch-icon" sizes="180x180" href="../../assets/favicon/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="../../assets/favicon/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="../../assets/favicon/favicon-16.png">
  <link rel="manifest" href="../../site.webmanifest">
  <link rel="canonical" href="${BASE_URL}/en/exercises/">
  <link rel="alternate" hreflang="en" href="${BASE_URL}/en/exercises/">
  <link rel="alternate" hreflang="ja" href="${BASE_URL}/ja/exercises/">
  <link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/exercises/">
  <script>document.documentElement.classList.add("js-enabled");</script>
  <script type="application/ld+json">${structuredData}</script>
  <link rel="stylesheet" href="../../css/style.css">
</head>
<body class="exercise-list-page">
  <div class="container">
    <header class="app-header">
      <div class="app-header-inner">
        <a class="app-brand" href="../index.html">
          <img src="../../assets/app/app-icon.png" alt="Biggr app icon" class="app-icon">
          <span class="app-name">Biggr</span>
        </a>
        <a class="app-cta" href="${APP_STORE_URL}">Download on the App Store</a>
      </div>
    </header>

    <main class="main-content">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="../index.html">Biggr</a>
        <span aria-hidden="true">/</span>
        <span>Exercise Library</span>
      </nav>

      <section class="exercise-hero">
        <h1 class="exercise-page-title">Exercise Library</h1>
        <p class="exercise-page-lead">Browse exercises available in Biggr by muscle group. Check how to perform them and basic rep guidance.</p>
      </section>

      <section class="section exercise-browser" aria-labelledby="exercise-browser-title">
        <div class="section-header section-header-left">
          <h2 class="section-title" id="exercise-browser-title">Browse by muscle group</h2>
        </div>

        <label class="exercise-search-label" for="exercise-search">Search exercises</label>
        <input class="exercise-search-input" id="exercise-search" type="search" placeholder="e.g. Bench Press / Dumbbell Curl / squat" autocomplete="off">

        <nav class="exercise-tabs" aria-label="Muscle group categories" role="tablist">
          ${categoryNav}
        </nav>

        <p id="exercise-search-status" class="exercise-search-status" aria-live="polite"></p>

        ${categorySections}
      </section>

      <section class="section exercise-list-cta" id="download">
        ${renderDownloadPanelEn("../../assets")}
      </section>
    </main>

    <hr class="footer-divider">

    <footer class="site-footer">
      <div class="footer-content">
        <div class="footer-brand">
          <img src="../../assets/app/app-icon.png" alt="Biggr app icon" class="footer-icon">
          <div class="footer-lang">
            <p class="footer-title">Language</p>
            <select id="lang-select" class="footer-select" aria-label="Language" onchange="location.href=this.value;">
              <option value="../../ja/exercises/index.html">日本語</option>
              <option value="./index.html" selected>English</option>
            </select>
          </div>
        </div>
        <div class="footer-column footer-about">
          <p class="footer-title">About</p>
          <div class="footer-list">
            <a href="${APP_STORE_URL}">Get the app</a>
          </div>
        </div>
        <div class="footer-column footer-support">
          <p class="footer-title">Support</p>
          <div class="footer-list">
            <a href="./index.html">Exercise Library</a>
            <a href="../faq.html">FAQ</a>
            <a href="../releasenotes.html">Release Notes</a>
            <a href="https://forms.gle/xawttwzNAxQLWsqz7" target="_blank" rel="noopener">Contact</a>
          </div>
        </div>
        <div class="footer-column footer-legal">
          <p class="footer-title">Legal</p>
          <div class="footer-list">
            <a href="../privacypolicy.html">Privacy Policy</a>
            <a href="../terms.html">Terms of Service</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="footer-meta">© ${new Date().getFullYear()} Biggr App</p>
      </div>
    </footer>
  </div>

  <script>
    (function () {
      var tabs = Array.prototype.slice.call(document.querySelectorAll(".exercise-tab"));
      var sections = Array.prototype.slice.call(document.querySelectorAll(".exercise-category"));
      var searchInput = document.getElementById("exercise-search");
      var searchStatus = document.getElementById("exercise-search-status");

      function setActiveCategory(category) {
        tabs.forEach(function (tab) {
          var active = tab.dataset.category === category;
          tab.classList.toggle("is-active", active);
          tab.setAttribute("aria-selected", active ? "true" : "false");
        });

        sections.forEach(function (section) {
          section.classList.toggle("is-active", section.dataset.category === category);
        });
      }

      function getActiveCategory() {
        var activeTab = tabs.find(function (tab) {
          return tab.classList.contains("is-active");
        });
        if (activeTab) {
          return activeTab.dataset.category;
        }
        return sections.length > 0 ? sections[0].dataset.category : "${escapeHtml(defaultCategory)}";
      }

      function updateSearch() {
        var keyword = (searchInput.value || "").trim().toLowerCase();
        var visibleCount = 0;

        if (!keyword) {
          sections.forEach(function (section) {
            section.classList.remove("is-searching");
            section.hidden = false;
            Array.prototype.forEach.call(section.querySelectorAll(".exercise-equipment-group"), function (group) {
              group.hidden = false;
            });
            Array.prototype.forEach.call(section.querySelectorAll(".exercise-card"), function (card) {
              card.hidden = false;
            });
          });
          searchStatus.textContent = "";
          return;
        }

        var activeCategory = getActiveCategory();

        sections.forEach(function (section) {
          var isTargetSection = section.dataset.category === activeCategory;
          var sectionVisibleCount = 0;
          section.classList.add("is-searching");

          if (!isTargetSection) {
            section.hidden = true;
            section.classList.remove("is-active");
            return;
          }

          Array.prototype.forEach.call(section.querySelectorAll(".exercise-equipment-group"), function (group) {
            var groupVisibleCount = 0;

            Array.prototype.forEach.call(group.querySelectorAll(".exercise-card"), function (card) {
              var haystack = (card.dataset.name + " " + card.dataset.aliases + " " + card.dataset.muscleGroup).toLowerCase();
              var matched = haystack.indexOf(keyword) !== -1;
              card.hidden = !matched;
              if (matched) {
                groupVisibleCount += 1;
                sectionVisibleCount += 1;
                visibleCount += 1;
              }
            });

            group.hidden = groupVisibleCount === 0;
          });

          section.hidden = false;
          section.classList.add("is-active");
        });

        searchStatus.textContent = "Results: " + visibleCount;
      }

      tabs.forEach(function (tab) {
        tab.addEventListener("click", function (event) {
          event.preventDefault();
          setActiveCategory(tab.dataset.category);
          history.replaceState(null, "", "#category-" + tab.dataset.category);
          updateSearch();
        });
      });

      if (searchInput) {
        searchInput.addEventListener("input", updateSearch);
      }

      var hash = window.location.hash.replace("#category-", "");
      var targetCategory = tabs.some(function (tab) {
        return tab.dataset.category === hash;
      })
        ? hash
        : "${escapeHtml(defaultCategory)}";

      setActiveCategory(targetCategory);
      updateSearch();
    })();
  </script>
</body>
</html>`;
}

function detailPageHtml(exercise, detail, relatedExercises) {
  const equipmentLabel = mapLabel(EQUIPMENT_LABELS, exercise.equipment, "その他");
  const muscleGroupLabel = mapLabel(MUSCLE_GROUP_LABELS, exercise.muscleGroup, "その他");
  const trackingTypeLabel = mapLabel(TRACKING_TYPE_LABELS, exercise.trackingType, "未設定");

  const repGuide = buildRepGuide(exercise, detail.repGuide);
  const howToSteps = buildHowToSteps(exercise, detail.howToSteps);
  const formPoints = buildFormPoints(exercise, detail.formPoints);
  const tips = buildTips(exercise, detail.tips);
  const socialLinks = buildSocialLinks(exercise, detail);
  const aliases = displayAliasesForDetail(exercise);

  const leadText = buildLeadText(exercise);
  const detailImageSrc = toDetailExerciseImageSrc(exercise);
  const seoTitle = buildSeoTitle(exercise, detail);
  const seoDescription = buildSeoDescription(exercise, detail, equipmentLabel);
  const canonicalUrl = `${BASE_URL}/ja/exercises/${exercise.slug}/`;
  const structuredData = JSON.stringify(buildDetailStructuredData(exercise, seoDescription));
  const variationsHtml = isLatPulldown(exercise) ? renderLatPulldownVariations() : "";

  const aliasesHtml = aliases.length > 0
    ? `<div class="detail-fact">
            <dt>別名</dt>
            <dd>${aliases.map((alias) => escapeHtml(alias)).join(" / ")}</dd>
          </div>`
    : "";

  const socialCardsHtml = socialLinks
    .map((social) => {
      return `<a class="social-link-card social-link-card-${escapeHtml(social.platform)}" href="${escapeHtml(
        social.url
      )}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(social.ctaLabel)}">
          <img src="${escapeHtml(social.iconUrl)}" alt="" loading="lazy" decoding="async" class="social-link-logo">
        </a>`;
    })
    .join("\n            ");

  const socialLinksHtml = `<section class="section exercise-detail-section" id="social-videos">
        <h2 class="exercise-detail-heading">SNS参考動画</h2>
        <div class="social-link-grid">
          ${socialCardsHtml}
        </div>
      </section>`;

  const relatedHtml = relatedExercises
    .map((related) => {
      const relatedEquipment = mapLabel(EQUIPMENT_LABELS, related.equipment, "その他");
      return `<li>
          <a class="related-item" href="../${escapeHtml(related.slug)}/">${escapeHtml(related.name)}
          <span class="related-meta">${escapeHtml(mapLabel(MUSCLE_GROUP_LABELS, related.muscleGroup, "その他"))} / ${escapeHtml(
            relatedEquipment
          )}</span></a>
        </li>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(seoTitle)}</title>
  <meta name="description" content="${escapeHtml(seoDescription)}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(seoTitle)}">
  <meta property="og:description" content="${escapeHtml(seoDescription)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${BASE_URL}/assets/hero/hero-ja-light.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="apple-touch-icon" sizes="180x180" href="../../../assets/favicon/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="../../../assets/favicon/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="../../../assets/favicon/favicon-16.png">
  <link rel="manifest" href="../../../site.webmanifest">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="alternate" hreflang="ja" href="${canonicalUrl}">
  <link rel="alternate" hreflang="x-default" href="${canonicalUrl}">
  <script type="application/ld+json">${structuredData}</script>
  <link rel="stylesheet" href="../../../css/style.css">
</head>
<body class="exercise-detail-page">
  <div class="container">
    <header class="app-header">
      <div class="app-header-inner">
        <a class="app-brand" href="../../index.html">
          <img src="../../../assets/app/app-icon.png" alt="Biggr app icon" class="app-icon">
          <span class="app-name">Biggr</span>
        </a>
        <a class="app-cta" href="${APP_STORE_URL}">App Storeで入手</a>
      </div>
    </header>

    <main class="main-content">
      <nav class="breadcrumb" aria-label="パンくず">
        <a href="../../index.html">Biggr</a>
        <span aria-hidden="true">/</span>
        <a href="../index.html">筋トレ種目一覧</a>
        <span aria-hidden="true">/</span>
        <span>${escapeHtml(exercise.name)}</span>
      </nav>

      <article class="exercise-detail-article">
        <h1 class="exercise-page-title">${escapeHtml(exercise.name)}</h1>
        <p class="exercise-page-lead">${escapeHtml(leadText)}</p>
        <div class="exercise-detail-media">
          <img src="${escapeHtml(detailImageSrc)}" alt="${escapeHtml(exercise.name)}の種目イメージ" class="exercise-detail-image" loading="lazy" decoding="async">
        </div>

        <section class="section exercise-basic-info" aria-labelledby="basic-info-title">
          <h2 class="exercise-detail-heading" id="basic-info-title">基本情報</h2>
          <dl class="detail-facts">
            <div class="detail-fact">
              <dt>対象部位</dt>
              <dd>${escapeHtml(muscleGroupLabel)}</dd>
            </div>
            <div class="detail-fact">
              <dt>器具</dt>
              <dd>${escapeHtml(equipmentLabel)}</dd>
            </div>
            <div class="detail-fact">
              <dt>記録形式</dt>
              <dd>${escapeHtml(trackingTypeLabel)}</dd>
            </div>
            ${aliasesHtml}
          </dl>
        </section>

        ${variationsHtml}

        ${socialLinksHtml}

        <section class="section exercise-detail-section" id="how-to">
          <h2 class="exercise-detail-heading">動作方法</h2>
          <ol class="howto-list">
            ${howToSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("\n            ")}
          </ol>
        </section>

        <section class="section exercise-detail-section" id="form-points">
          <h2 class="exercise-detail-heading">動作ポイント</h2>
          <ul class="form-points-list">
            ${formPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("\n            ")}
          </ul>
        </section>

        <section class="section exercise-detail-section" id="tips">
          <h2 class="exercise-detail-heading">ワンポイントアドバイス</h2>
          <ul class="tips-list">
            ${tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join("\n            ")}
          </ul>
        </section>

        <section class="section exercise-detail-section" id="rep-guide">
          <h2 class="exercise-detail-heading">目的別回数設定</h2>
          <p class="exercise-detail-note">目的や体力に応じた一般的な目安です。無理のない範囲で調整してください。</p>
          <dl class="rep-guide-list">
            <div class="rep-guide-item">
              <dt>筋力アップ</dt>
              <dd>${escapeHtml(repGuide.strength)}</dd>
            </div>
            <div class="rep-guide-item">
              <dt>筋肥大</dt>
              <dd>${escapeHtml(repGuide.hypertrophy)}</dd>
            </div>
            <div class="rep-guide-item">
              <dt>持久力アップ</dt>
              <dd>${escapeHtml(repGuide.endurance)}</dd>
            </div>
          </dl>
        </section>

        <section class="section exercise-detail-section" id="related">
          <h2 class="exercise-detail-heading">関連種目</h2>
          <ul class="related-list">
            ${relatedHtml}
          </ul>
          <p class="exercise-detail-copy"><a href="../index.html">筋トレ種目一覧に戻る</a></p>
        </section>

        <section class="section exercise-detail-cta" id="download">
          ${renderDownloadPanel("../../../assets")}
        </section>
      </article>
    </main>

    <hr class="footer-divider">

    <footer class="site-footer">
      <div class="footer-content">
        <div class="footer-brand">
          <img src="../../../assets/app/app-icon.png" alt="Biggr app icon" class="footer-icon">
          <div class="footer-lang">
            <p class="footer-title">言語</p>
            <select id="lang-select" class="footer-select" aria-label="言語" onchange="location.href=this.value;">
              <option value="../index.html" selected>日本語</option>
              <option value="../../../en/index.html">English</option>
            </select>
          </div>
        </div>
        <div class="footer-column footer-about">
          <p class="footer-title">アプリについて</p>
          <div class="footer-list">
            <a href="${APP_STORE_URL}">App Storeで入手</a>
          </div>
        </div>
        <div class="footer-column footer-support">
          <p class="footer-title">サポート</p>
          <div class="footer-list">
            <a href="../index.html">筋トレ種目一覧</a>
            <a href="../../faq.html">FAQ</a>
            <a href="../../releasenotes.html">リリースノート</a>
            <a href="https://forms.gle/xawttwzNAxQLWsqz7" target="_blank" rel="noopener">お問い合わせ</a>
          </div>
        </div>
        <div class="footer-column footer-legal">
          <p class="footer-title">法的情報</p>
          <div class="footer-list">
            <a href="../../privacypolicy.html">プライバシーポリシー</a>
            <a href="../../terms.html">利用規約</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="footer-meta">© ${new Date().getFullYear()} Biggr App</p>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

function detailPageHtmlEnLatPulldown(exercise) {
  const aliases = displayAliasesForDetailEn(exercise);
  const seoTitle = "What Is Lat Pulldown? Muscles Worked, Equipment, and Variations | Biggr";
  const seoDescription =
    "Learn the basics of Lat Pulldown, including muscles worked, form basics, rep guidance, and variations such as wide grip, MAG grip, and straight-arm pulldown.";
  const canonicalUrl = `${BASE_URL}/en/exercises/${exercise.slug}/`;
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: exercise.nameEn,
        description: seoDescription,
        inLanguage: "en",
        url: canonicalUrl
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Biggr", item: `${BASE_URL}/en/` },
          { "@type": "ListItem", position: 2, name: "Exercise Library", item: `${BASE_URL}/en/exercises/` },
          { "@type": "ListItem", position: 3, name: exercise.nameEn, item: canonicalUrl }
        ]
      }
    ]
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(seoTitle)}</title>
  <meta name="description" content="${escapeHtml(seoDescription)}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(seoTitle)}">
  <meta property="og:description" content="${escapeHtml(seoDescription)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${BASE_URL}/assets/hero/hero-en-light.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="apple-touch-icon" sizes="180x180" href="../../../assets/favicon/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="../../../assets/favicon/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="../../../assets/favicon/favicon-16.png">
  <link rel="manifest" href="../../../site.webmanifest">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="alternate" hreflang="en" href="${canonicalUrl}">
  <link rel="alternate" hreflang="ja" href="${BASE_URL}/ja/exercises/${exercise.slug}/">
  <link rel="alternate" hreflang="x-default" href="${canonicalUrl}">
  <script type="application/ld+json">${structuredData}</script>
  <link rel="stylesheet" href="../../../css/style.css">
</head>
<body class="exercise-detail-page">
  <div class="container">
    <header class="app-header">
      <div class="app-header-inner">
        <a class="app-brand" href="../../index.html">
          <img src="../../../assets/app/app-icon.png" alt="Biggr app icon" class="app-icon">
          <span class="app-name">Biggr</span>
        </a>
        <a class="app-cta" href="${APP_STORE_URL}">Download on the App Store</a>
      </div>
    </header>

    <main class="main-content">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="../../index.html">Biggr</a>
        <span aria-hidden="true">/</span>
        <a href="../index.html">Exercise Library</a>
        <span aria-hidden="true">/</span>
        <span>${escapeHtml(exercise.nameEn)}</span>
      </nav>

      <article class="exercise-detail-article">
        <h1 class="exercise-page-title">${escapeHtml(exercise.nameEn)}</h1>
        <p class="exercise-page-lead">${escapeHtml(exercise.descEn)}</p>
        <div class="exercise-detail-media">
          <img src="../../../assets/exercises/${escapeHtml(exercise.slug)}.png" alt="${escapeHtml(
            exercise.nameEn
          )} exercise image" class="exercise-detail-image" loading="lazy" decoding="async">
        </div>

        <section class="section exercise-basic-info" aria-labelledby="basic-info-title">
          <h2 class="exercise-detail-heading" id="basic-info-title">Basic Info</h2>
          <dl class="detail-facts">
            <div class="detail-fact">
              <dt>Primary Muscle Group</dt>
              <dd>Back</dd>
            </div>
            <div class="detail-fact">
              <dt>Equipment</dt>
              <dd>Cable</dd>
            </div>
            <div class="detail-fact">
              <dt>Tracking</dt>
              <dd>Weight and reps</dd>
            </div>
            <div class="detail-fact">
              <dt>Also Known As</dt>
              <dd>${aliases.map((alias) => escapeHtml(alias)).join(" / ")}</dd>
            </div>
          </dl>
        </section>

        ${renderLatPulldownVariationsEn()}

        <section class="section exercise-detail-section" id="how-to">
          <h2 class="exercise-detail-heading">How to Perform</h2>
          <ol class="howto-list">
            <li>Keep your chest lifted and shoulders down.</li>
            <li>Pull the handle toward the upper chest with the elbows.</li>
            <li>Control the return without letting tension drop.</li>
          </ol>
        </section>

        <section class="section exercise-detail-section" id="form-points">
          <h2 class="exercise-detail-heading">Form Tips</h2>
          <ul class="form-points-list">
            <li>Do not overarch the lower back.</li>
            <li>Keep the shoulders from rolling forward.</li>
            <li>Use a load you can control without swinging.</li>
          </ul>
        </section>

        <section class="section exercise-detail-section" id="rep-guide">
          <h2 class="exercise-detail-heading">Rep Guide</h2>
          <p class="exercise-detail-note">General guidelines. Adjust based on your goal, experience, and condition.</p>
          <ul class="rep-guide-list">
            <li><span class="rep-guide-label">Strength:</span> 1-5 reps</li>
            <li><span class="rep-guide-label">Hypertrophy:</span> 6-12 reps</li>
            <li><span class="rep-guide-label">Endurance:</span> 13-20 reps</li>
          </ul>
        </section>

        <section class="section exercise-detail-section" id="related">
          <h2 class="exercise-detail-heading">Related Exercises</h2>
          <ul class="related-list">
            <li><a class="related-item" href="../seated-cable-row/">Seated Cable Row<span class="related-meta">Back / Cable</span></a></li>
            <li><a class="related-item" href="../cable-pullover/">Cable Pullover<span class="related-meta">Back / Cable</span></a></li>
            <li><a class="related-item" href="../pull-up/">Pull-up<span class="related-meta">Back / Bodyweight</span></a></li>
          </ul>
          <p class="exercise-detail-copy"><a href="../index.html">Back to Exercise Library</a></p>
        </section>

        <section class="section exercise-detail-cta" id="download">
          ${renderDownloadPanelEn("../../../assets")}
        </section>
      </article>
    </main>

    <hr class="footer-divider">

    <footer class="site-footer">
      <div class="footer-content">
        <div class="footer-brand">
          <img src="../../../assets/app/app-icon.png" alt="Biggr app icon" class="footer-icon">
          <div class="footer-lang">
            <p class="footer-title">Language</p>
            <select id="lang-select" class="footer-select" aria-label="Language" onchange="location.href=this.value;">
              <option value="../../../ja/exercises/${escapeHtml(exercise.slug)}/">日本語</option>
              <option value="../${escapeHtml(exercise.slug)}/" selected>English</option>
            </select>
          </div>
        </div>
        <div class="footer-column footer-about">
          <p class="footer-title">About</p>
          <div class="footer-list">
            <a href="${APP_STORE_URL}">Download on the App Store</a>
          </div>
        </div>
        <div class="footer-column footer-support">
          <p class="footer-title">Support</p>
          <div class="footer-list">
            <a href="../index.html">Exercise Library</a>
            <a href="../../faq.html">FAQ</a>
            <a href="../../releasenotes.html">Release Notes</a>
            <a href="https://forms.gle/xawttwzNAxQLWsqz7" target="_blank" rel="noopener">Contact</a>
          </div>
        </div>
        <div class="footer-column footer-legal">
          <p class="footer-title">Legal</p>
          <div class="footer-list">
            <a href="../../privacypolicy.html">Privacy Policy</a>
            <a href="../../terms.html">Terms of Service</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="footer-meta">© ${new Date().getFullYear()} Biggr App</p>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

function redirectPageHtml({ lang, slug }) {
  const isJa = lang === "ja";
  const targetUrl = `${BASE_URL}/${lang}/exercises/${LAT_PULLDOWN_SLUG}/`;
  const relativeTarget = `../${LAT_PULLDOWN_SLUG}/`;
  const title = isJa ? "ラットプルダウンに統合しました | Biggr" : "Moved to Lat Pulldown | Biggr";
  const description = isJa
    ? "この種目ページはラットプルダウンに統合しました。"
    : "This exercise page has moved to Lat Pulldown.";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=${relativeTarget}">
  <link rel="canonical" href="${targetUrl}">
  <meta name="robots" content="noindex, follow">
  <link rel="stylesheet" href="../../../css/style.css">
</head>
<body class="exercise-detail-page">
  <div class="container">
    <main class="main-content">
      <article class="exercise-detail-article">
        <h1 class="exercise-page-title">${isJa ? "ラットプルダウンに統合しました" : "Moved to Lat Pulldown"}</h1>
        <p class="exercise-page-lead">${escapeHtml(description)}</p>
        <p class="exercise-detail-copy"><a href="${relativeTarget}">${
          isJa ? "ラットプルダウンを見る" : "Open Lat Pulldown"
        }</a></p>
      </article>
    </main>
  </div>
</body>
</html>`;
}

function buildCategories(exercises) {
  const categories = MUSCLE_GROUP_ORDER.filter((category) => exercises.some((exercise) => exercise.muscleGroup === category));

  // 想定外のカテゴリがデータにある場合は「その他」扱いで末尾に追加。
  const known = new Set(MUSCLE_GROUP_ORDER);
  const unknownCategories = Array.from(new Set(exercises.map((exercise) => exercise.muscleGroup))).filter(
    (category) => !known.has(category)
  );

  return categories.concat(unknownCategories);
}

async function writeExercisePages(exercises, detailMap) {
  // Ensure removed/renamed slugs do not leave stale HTML files.
  await fs.rm(JA_EXERCISES_DIR, { recursive: true, force: true });
  await fs.mkdir(JA_EXERCISES_DIR, { recursive: true });
  await fs.mkdir(EN_EXERCISES_DIR, { recursive: true });

  const categories = buildCategories(exercises);
  const listHtml = listPageHtml(exercises, categories);
  await fs.writeFile(path.join(JA_EXERCISES_DIR, "index.html"), listHtml, "utf-8");
  const listHtmlEn = listPageHtmlEn(exercises, categories);
  await fs.writeFile(path.join(EN_EXERCISES_DIR, "index.html"), listHtmlEn, "utf-8");

  for (const exercise of exercises) {
    const detail = detailMap[exercise.id] || detailMap[exercise.slug] || {};
    const related = buildRelatedExercises(exercises, exercise, detail);
    const html = detailPageHtml(exercise, detail, related);
    const targetDir = path.join(JA_EXERCISES_DIR, exercise.slug);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, "index.html"), html, "utf-8");

    if (isLatPulldown(exercise)) {
      const enTargetDir = path.join(EN_EXERCISES_DIR, exercise.slug);
      await fs.mkdir(enTargetDir, { recursive: true });
      await fs.writeFile(path.join(enTargetDir, "index.html"), detailPageHtmlEnLatPulldown(exercise), "utf-8");
    }
  }

  for (const slug of LAT_PULLDOWN_REDIRECT_SLUGS) {
    const jaRedirectDir = path.join(JA_EXERCISES_DIR, slug);
    await fs.mkdir(jaRedirectDir, { recursive: true });
    await fs.writeFile(path.join(jaRedirectDir, "index.html"), redirectPageHtml({ lang: "ja", slug }), "utf-8");

    const enRedirectDir = path.join(EN_EXERCISES_DIR, slug);
    await fs.mkdir(enRedirectDir, { recursive: true });
    await fs.writeFile(path.join(enRedirectDir, "index.html"), redirectPageHtml({ lang: "en", slug }), "utf-8");
  }

  return categories;
}

function parseSitemap(xmlText) {
  const urlBlocks = xmlText.match(/<url>[\s\S]*?<\/url>/g) || [];

  return urlBlocks
    .map((block) => {
      const loc = (block.match(/<loc>(.*?)<\/loc>/) || [])[1];
      const lastmod = (block.match(/<lastmod>(.*?)<\/lastmod>/) || [])[1];
      const changefreq = (block.match(/<changefreq>(.*?)<\/changefreq>/) || [])[1];
      if (!loc) {
        return null;
      }
      return { loc, lastmod: lastmod || TODAY, changefreq: changefreq || "monthly" };
    })
    .filter(Boolean);
}

function stringifySitemap(entries) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];

  for (const entry of entries) {
    lines.push("  <url>");
    lines.push(`    <loc>${entry.loc}</loc>`);
    lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  lines.push("");
  return lines.join("\n");
}

async function updateSitemap(exercises) {
  const xmlText = await fs.readFile(SITEMAP_PATH, "utf-8");
  const parsedEntries = parseSitemap(xmlText);

  const filteredEntries = parsedEntries.filter(
    (entry) => !entry.loc.includes("/ja/exercises/") && !entry.loc.includes("/en/exercises/")
  );

  filteredEntries.push({
    loc: `${BASE_URL}/ja/exercises/`,
    lastmod: TODAY,
    changefreq: "weekly"
  });
  filteredEntries.push({
    loc: `${BASE_URL}/en/exercises/`,
    lastmod: TODAY,
    changefreq: "weekly"
  });

  const sortedExercises = exercises.slice().sort((a, b) => a.slug.localeCompare(b.slug, "en"));
  for (const exercise of sortedExercises) {
    filteredEntries.push({
      loc: `${BASE_URL}/ja/exercises/${exercise.slug}/`,
      lastmod: TODAY,
      changefreq: "monthly"
    });
    filteredEntries.push({
      loc: `${BASE_URL}/en/exercises/${exercise.slug}/`,
      lastmod: TODAY,
      changefreq: "monthly"
    });
  }

  const xmlOut = stringifySitemap(filteredEntries);
  await fs.writeFile(SITEMAP_PATH, xmlOut, "utf-8");
}

function validateExercises(exercises) {
  const idSet = new Set();
  const idDuplicates = [];

  for (const exercise of exercises) {
    if (idSet.has(exercise.id)) {
      idDuplicates.push(exercise.id);
    }
    idSet.add(exercise.id);
  }

  if (idDuplicates.length > 0) {
    throw new Error(`Duplicate exercise id found: ${idDuplicates.join(", ")}`);
  }
}

async function main() {
  const exercisesRaw = await readJson(path.join(DATA_DIR, "exercises.json"));
  const detailMap = await readJson(path.join(DATA_DIR, "exercise-detail-ja.json"));

  if (!Array.isArray(exercisesRaw) || exercisesRaw.length === 0) {
    throw new Error("data/exercises.json must be a non-empty array.");
  }

  validateExercises(exercisesRaw);

  const usedSlugs = new Set();
  const exercises = exercisesRaw.map((rawExercise) => {
    const slug = resolveSlug(rawExercise, usedSlugs);
    return normalizeExercise(rawExercise, slug);
  });

  const createdImageCount = await ensureExercisePlaceholderImages(exercises);
  const categories = await writeExercisePages(exercises, detailMap);
  await updateSitemap(exercises);

  const detailCount = exercises.filter((exercise) => detailMap[exercise.id] || detailMap[exercise.slug]).length;
  const missingDetail = exercises.length - detailCount;

  console.log(`[generate] Completed. ${exercises.length} exercises, ${categories.length} categories.`);
  console.log(`[generate] Placeholder images: ${createdImageCount} created, ${exercises.length - createdImageCount} existing.`);
  console.log(`[generate] Wrote: docs/ja/exercises/index.html + ${exercises.length} detail pages.`);
  console.log(`[generate] Updated: docs/sitemap.xml`);
  console.log(`[report] detail data coverage: ${detailCount}/${exercises.length} exercises (${missingDetail} using fallbacks).`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
