import fs from "fs";
import path from "path";
import os from "os";

const profilePath = path.join(
  os.homedir(),
  "AppData",
  "Roaming",
  "meu-projeto",
  "profile.json"
);

function loadProfile() {
  try {
    if (fs.existsSync(profilePath)) {
      const raw = fs.readFileSync(profilePath, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        artists: parsed.artists || {},
        history: parsed.history || [],
      };
    }
  } catch (e) {
    console.error("Erro ao carregar perfil:", e);
  }
  return { artists: {}, history: [] };
}

function saveProfile(profile) {
  try {
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
    console.log("✅ Perfil salvo em:", profilePath);
  } catch (e) {
    console.error("❌ Erro ao salvar perfil:", e);
  }
}

// Inicialização segura
let profile;
try {
  profile = loadProfile();
} catch {
  profile = { artists: {}, history: [] };
}
if (!profile || typeof profile !== "object") {
  profile = { artists: {}, history: [] };
}
if (!profile.artists) profile.artists = {};
if (!profile.history) profile.history = [];

// 🔥 GARANTE que o arquivo exista no disco imediatamente
if (!fs.existsSync(profilePath)) {
  saveProfile(profile); // cria profile.json com estrutura vazia
}

export function saveListeningEvent({ id, title, channel }) {
  if (!channel) return;
  profile.artists[channel] = (profile.artists[channel] || 0) + 1;
  profile.history.unshift({ id, title, channel, timestamp: Date.now() });
  if (profile.history.length > 50) profile.history.pop();
  saveProfile(profile);
}

export function getUserProfile() {
  return {
    topArtists: getTopArtists(5),
    recentVideos: profile.history.slice(0, 10),
    artists: { ...profile.artists },   // <-- agora sempre presente
  };
}

function getTopArtists(limit = 5) {
  return Object.entries(profile.artists)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}