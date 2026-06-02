// src/main/adblocker.js
import { app, session } from "electron";
import path from "path";
import fs from "fs/promises";
import { ElectronBlocker } from "@ghostery/adblocker-electron";
import fetch from "cross-fetch";

// Listas de filtro essenciais para bloquear anúncios no YouTube e rastreadores
const FILTER_LISTS = [
  // Listas essenciais
  "https://easylist.to/easylist/easylist.txt",
  "https://easylist.to/easylist/easyprivacy.txt",

  // Listas do uBlock Origin (focam em anti-adblock e correções rápidas)
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt",

  // Lista complementar de hosts (Peter Lowe)
  "https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&mimetype=plaintext",

  // ===== NOVAS LISTAS (muito eficazes contra anúncios do YouTube) =====
  "https://filters.adtidy.org/extension/ublock/filters/2.txt", // AdGuard Base
  "https://filters.adtidy.org/extension/ublock/filters/14.txt", // AdGuard Annoyances
  "https://filters.adtidy.org/extension/ublock/filters/17.txt", // AdGuard Tracking Protection (opcional)
];

// Configuração do cache em disco
const CACHE_PATH = path.join(app.getPath("userData"), "adblocker-cache.bin");
const UPDATE_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 horas

let engine = null;
let updateTimer = null;

/**
 * Salva o estado serializado do motor de bloqueio no arquivo de cache.
 */
async function saveEngineToCache(engineInstance) {
  try {
    const serialized = await engineInstance.serialize();
    await fs.writeFile(CACHE_PATH, serialized);
    console.log("[Adblock] Cache salvo em:", CACHE_PATH);
  } catch (err) {
    console.error("[Adblock] Erro ao salvar cache:", err);
  }
}

/**
 * Cria ou carrega o motor a partir do cache, usando as listas de filtro.
 */
async function createOrLoadEngine() {
  const cacheOptions = {
    path: CACHE_PATH,
    read: fs.readFile,
    write: fs.writeFile,
  };

  // Tenta carregar do cache primeiro
  try {
    await fs.access(CACHE_PATH);
    console.log("[Adblock] Cache encontrado, tentando carregar...");
    const serialized = await fs.readFile(CACHE_PATH);
    engine = await ElectronBlocker.deserialize(serialized);
    // O motor deserializado pode não estar associado a nenhuma sessão ainda, tudo bem.
    console.log("[Adblock] Motor carregado do cache.");
    // Atualiza as listas em segundo plano (não bloqueia a inicialização)
    updateEngineFromLists();
    return engine;
  } catch (err) {
    console.log(
      "[Adblock] Cache não encontrado ou inválido, baixando listas...",
    );
  }

  // Se não havia cache, cria do zero baixando todas as listas
  engine = await ElectronBlocker.fromLists(fetch, FILTER_LISTS, {
    enableCompression: true,
    ...cacheOptions,
  });
  console.log("[Adblock] Motor criado a partir das listas.");
  await saveEngineToCache(engine);
  return engine;
}

/**
 * Atualiza o motor com as listas mais recentes e recria o cache.
 */
async function updateEngineFromLists() {
  if (!engine) return;
  try {
    console.log("[Adblock] Atualizando listas de filtro...");
    await engine.updateFromLists(fetch, FILTER_LISTS, {
      enableCompression: true,
    });
    console.log("[Adblock] Listas atualizadas com sucesso.");
    await saveEngineToCache(engine);
  } catch (err) {
    console.error("[Adblock] Falha ao atualizar listas:", err);
  }
}

/**
 * Inicia o temporizador de atualização periódica das listas.
 */
function scheduleUpdates() {
  if (updateTimer) clearInterval(updateTimer);
  updateTimer = setInterval(() => {
    updateEngineFromLists();
  }, UPDATE_INTERVAL_MS);
  console.log(
    `[Adblock] Atualizações automáticas a cada ${UPDATE_INTERVAL_MS / 3600000}h.`,
  );
}

/**
 * Configura o adblocker na sessão especificada (ex.: particionada para o webview do YouTube).
 * @param {string} partition - Nome da partição (ex: 'persist:youtube')
 * @returns {Promise<ElectronBlocker>} Instância do motor de bloqueio.
 */
export async function setupAdBlocker(partition) {
  // Evita múltiplas inicializações, mas permite ativar em outras sessões se necessário
  if (!engine) {
    engine = await createOrLoadEngine();
    scheduleUpdates();
  }

  // Habilita o bloqueio na sessão do webview
  const targetSession = session.fromPartition(partition);
  await engine.enableBlockingInSession(targetSession);

  console.log(`[Adblock] Bloqueio ativo na sessão "${partition}".`);
  return engine;
}

/**
 * Permite forçar uma atualização manual das listas.
 */
export async function forceUpdate() {
  if (!engine) {
    console.warn("[Adblock] Motor não inicializado. Inicie primeiro.");
    return;
  }
  await updateEngineFromLists();
}

/**
 * Interrompe o temporizador de atualizações (útil ao fechar o app).
 */
export function stopAutoUpdates() {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
    console.log("[Adblock] Atualizações automáticas interrompidas.");
  }
}
