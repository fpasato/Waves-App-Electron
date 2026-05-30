import { ipcMain } from "electron";
import { GoogleGenerativeAI } from "@google/generative-ai";
// Caminho relativo correto a partir de src/main/handlers/ para src/main/lib/titleUtils.js
import { cleanArtist, cleanFull } from "../../renderer/src/lib/titleUtils.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "SUA_API_KEY_AQUI";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function fetchArtistTitleFromGemini(fileName) {
  const prompt = `
    Analise o nome do arquivo de música abaixo e extraia o artista (ou banda) e o título da canção.
    Retorne APENAS um objeto JSON válido no seguinte formato, sem texto adicional:
    { "artist": "Nome do Artista", "title": "Título da Música" }
    Se não for possível identificar, retorne: { "artist": null, "title": null }

    Nome do arquivo: "${fileName}"
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.artist && parsed.title) {
        return {
          artist: cleanArtist(parsed.artist),
          title: cleanFull(parsed.title),
        };
      }
    }
    return { artist: null, title: null };
  } catch (error) {
    console.error("Gemini error:", error);
    return { artist: null, title: null };
  }
}

export function registerGeminiHandler() {
  ipcMain.handle("gemini:parse-filename", async (_event, fileName) => {
    return await fetchArtistTitleFromGemini(fileName);
  });
}