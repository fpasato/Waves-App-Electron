const VERSION_SUFFIXES = [
  /\(slowed[\s+&]*reverb\)/gi, /\[slowed[\s+&]*reverb\]/gi,
  /\(slowed\)/gi,              /\[slowed\]/gi,
  /\(reverb\)/gi,              /\[reverb\]/gi,
  /\(sped[\s-]*up\)/gi,        /\[sped[\s-]*up\]/gi,
  /\(nightcore\)/gi,           /\[nightcore\]/gi,
  /\(remix\)/gi,               /\[remix\]/gi,
];

const ALWAYS_NOISE = [
  /\s*[-–]\s*clipe\s*oficial\b.*/gi,
  /\(clipe\s*oficial\)/gi,
  /\(official[\w\s]*\)/gi,     /\[official[\w\s]*\]/gi,
  /\(lyrics?\)/gi,             /\[lyrics?\]/gi,
  /\(audio\)/gi,               /\[audio\]/gi,
  /\(visualizer\)/gi,          /\[visualizer\]/gi,
  /\(from\s+[^)]+\)/gi,        /\[from\s+[^\]]+\]/gi,
];

const FEAT_NOISE = [
  /\(?ft\.?\s+[^,\[\)(]+\)?/gi,
  /\(?feat\.?\s+[^,\[\)(]+\)?/gi,
  /\(?part\.?\s+[^,\[\)(]+\)?/gi,
];

export function removeYoutubeChannel(str) {
  if (!str) return "";
  return str
    .replace(/\s*[-–][^-–]*\(youtube\)\s*$/i, "")
    .replace(/\s*\(youtube\)\s*$/i, "");
}

function removeTrailingParens(str) {
  return str.replace(/\s*\([^)]+\)\s*$/, (match) => {
    const isVersion = VERSION_SUFFIXES.some((re) => {
      re.lastIndex = 0;
      return re.test(match);
    });
    return isVersion ? match : "";
  }).trim();
}

export function cleanBase(raw) {
  if (!raw) return "";
  let t = raw.trim();
  t = removeYoutubeChannel(t);
  for (const re of ALWAYS_NOISE) t = t.replace(re, "");
  for (const re of FEAT_NOISE)   t = t.replace(re, "");
  return t.trim();
}

export function cleanArtist(raw) {
  if (!raw) return "";
  let a = cleanFull(raw);
  a = a.split(/[,&/]/)[0];
  return a.trim();
}

export function splitArtistTitle(str) {
  if (!str) return null;
  const m = str.match(/^(.+?)\s*[-–]\s*(.+)$/);
  return m ? { artist: m[1].trim(), title: m[2].trim() } : null;
}

export function getFileNameWithoutExtension(filePath) {
  if (!filePath) return null;
  const parts = filePath.split(/[\\/]/);
  const name = parts[parts.length - 1];
  const dot = name.lastIndexOf(".");
  return dot === -1 ? name : name.substring(0, dot);
}


function removeEmojis(str) {
  return str
    .replace(/\p{Emoji_Presentation}[\p{Emoji}\uFE0F\u200D]*/gu, "")
    .trim();
}

export function cleanFull(raw) {
  let t = cleanBase(raw);
  for (const re of VERSION_SUFFIXES) t = t.replace(re, "");
  t = removeTrailingParens(t);
  t = removeEmojis(t);
  return t.trim();
}
