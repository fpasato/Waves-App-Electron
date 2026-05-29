import fetch from "cross-fetch";

const BASE = "https://www.radios.com.br";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const headers = {
  "User-Agent": USER_AGENT,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9",
  "Referer": BASE,
};

// ─── Extrai stream do HTML de uma página de rádio ────────────────────────────

export async function scrapeStream(pageUrl) {
  const res = await fetch(pageUrl, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // Padrões em ordem de prioridade
  const patterns = [
    // JSON embutido com campo "stream" ou "url"
    /"stream"\s*:\s*"(https?:\/\/[^"]+)"/i,
    /"streamUrl"\s*:\s*"(https?:\/\/[^"]+)"/i,
    /"url"\s*:\s*"(https?:\/\/[^"]+\.(?:m3u8|mp3|aac|ogg))"/i,
    // Tag <source src="...">
    /source[^>]+src=["'](https?:\/\/[^"']+\.(?:m3u8|mp3|aac|ogg)[^"']*)["']/i,
    // Tag <audio src="...">
    /audio[^>]+src=["'](https?:\/\/[^"']+\.(?:m3u8|mp3|aac|ogg)[^"']*)["']/i,
    // URL solta com extensão de áudio
    /(https?:\/\/[^\s"'<>]+\.(?:m3u8|mp3|aac|ogg))(?:\?[^\s"'<>]*)?/i,
  ];

  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m?.[1]) {
      console.log("[scraper] stream encontrada:", m[1]);
      return m[1];
    }
  }

  // Debug: loga início do HTML para diagnóstico
  console.warn("[scraper] stream não encontrada em:", pageUrl);
  console.log("[scraper] HTML snippet:", html.slice(0, 2000));
  return null;
}

// ─── Busca rádios por nome ────────────────────────────────────────────────────

export async function searchRadiosBr(query) {
  const url = `${BASE}/busca/${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return parseRadioList(html);
}

// ─── Rádios populares ─────────────────────────────────────────────────────────

export async function fetchPopularRadiosBr() {
  const res = await fetch(BASE, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return parseRadioList(html);
}

// ─── Parser de lista de rádios do HTML ───────────────────────────────────────

function parseRadioList(html) {
  const radios = [];
  // Extrai blocos de rádio: href="/aovivo/slug/id"
  const linkRe = /href="\/aovivo\/([^/]+)\/(\d+)"/g;
  const seen = new Set();
  let m;

  while ((m = linkRe.exec(html)) !== null) {
    const [, slug, id] = m;
    if (seen.has(id)) continue;
    seen.add(id);

    const name = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    // Tenta extrair favicon próximo ao link
    const snippet = html.slice(Math.max(0, m.index - 300), m.index + 300);
    const imgMatch = snippet.match(/src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|gif))["']/i);

    radios.push({
      id,
      slug,
      name,
      favicon: imgMatch?.[1] ?? "",
      stream: "",   // stream é buscada sob demanda via scrapeStream
      pageUrl: `${BASE}/aovivo/${slug}/${id}`,
      country: "Brasil",
      state: "",
      bitrate: 0,
      codec: "",
      tags: [],
    });
  }

  return radios;
}

// Mantido por compatibilidade — não usado no fluxo novo
export async function getRadioDetails(id) {
  throw new Error("Rádio não encontrada");
}