// src/main/adblocker.js
import { app, session } from "electron";
import path from "path";
import fs from "fs/promises";
import { ElectronBlocker } from "@ghostery/adblocker-electron";
import fetch from "cross-fetch";

// ----------------------------------------------------------------------
// Listas de filtro essenciais
// ----------------------------------------------------------------------
const FILTER_LISTS = [
  "https://easylist.to/easylist/easylist.txt",
  "https://easylist.to/easylist/easyprivacy.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt",
  "https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&mimetype=plaintext",
  "https://filters.adtidy.org/extension/ublock/filters/2.txt", // AdGuard Base
  "https://filters.adtidy.org/extension/ublock/filters/14.txt", // AdGuard Annoyances
  "https://filters.adtidy.org/extension/ublock/filters/17.txt", // AdGuard Tracking Protection
];

// ----------------------------------------------------------------------
// Configuração de cache e atualizações
// ----------------------------------------------------------------------
const UPDATE_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 horas
let engine = null;
let updateTimer = null;
let updateInProgress = false;

// Evita erro caso app.getPath seja chamado antes de app estar pronto
function getCachePath() {
  if (!app.isReady()) {
    throw new Error(
      "app ainda não está pronto – chame somente após app.whenReady()",
    );
  }
  return path.join(app.getPath("userData"), "adblocker-cache.bin");
}

// Escrita atômica: grava em arquivo temporário e depois renomeia
async function saveEngineToCache(engineInstance) {
  const cachePath = getCachePath();
  const tmpPath = `${cachePath}.tmp`;
  try {
    const serialized = await engineInstance.serialize();
    await fs.writeFile(tmpPath, serialized);
    await fs.rename(tmpPath, cachePath);
    console.log("[Adblock] Cache salvo:", cachePath);
  } catch (err) {
    console.error("[Adblock] Erro ao salvar cache:", err);
    // Tenta remover arquivo temporário em caso de falha
    try {
      await fs.unlink(tmpPath);
    } catch (_) {}
  }
}

// ----------------------------------------------------------------------
// Criação / carregamento do motor com suporte a cache
// ----------------------------------------------------------------------
async function createOrLoadEngine() {
  const cachePath = getCachePath();

  // Tenta carregar do cache
  try {
    await fs.access(cachePath);
    const serialized = await fs.readFile(cachePath);
    engine = await ElectronBlocker.deserialize(serialized);
    console.log("[Adblock] Motor carregado do cache.");
    // Atualiza em segundo plano (não bloqueia a inicialização)
    updateEngineIncremental().catch((err) =>
      console.warn(
        "[Adblock] Atualização inicial em segundo plano falhou:",
        err,
      ),
    );
    return engine;
  } catch {
    console.log(
      "[Adblock] Cache não encontrado ou inválido, criando motor do zero...",
    );
  }

  // Se não havia cache, cria baixando todas as listas
  engine = await ElectronBlocker.fromLists(fetch, FILTER_LISTS, {
    enableCompression: true,
  });
  console.log("[Adblock] Motor criado a partir das listas.");
  await saveEngineToCache(engine);
  return engine;
}

// ----------------------------------------------------------------------
// Atualização incremental (usando engine.update)
// ----------------------------------------------------------------------
async function updateEngineIncremental() {
  if (!engine) return;
  if (updateInProgress) {
    console.log("[Adblock] Atualização já em andamento, ignorando...");
    return;
  }
  updateInProgress = true;
  try {
    console.log("[Adblock] Iniciando atualização incremental das listas...");
    // Constrói a configuração esperada pelo método update
    const config = {
      lists: FILTER_LISTS,
      enableCompression: true,
    };
    await engine.update({ config, fetch });
    console.log("[Adblock] Motor atualizado com sucesso.");
    await saveEngineToCache(engine);
  } catch (err) {
    console.error("[Adblock] Falha na atualização incremental:", err);
    // Fallback: recria o motor completamente
    console.log("[Adblock] Tentando recriar o motor do zero...");
    engine = await ElectronBlocker.fromLists(fetch, FILTER_LISTS, {
      enableCompression: true,
    });
    await saveEngineToCache(engine);
  } finally {
    updateInProgress = false;
  }
}

// ----------------------------------------------------------------------
// Agendamento de atualizações automáticas
// ----------------------------------------------------------------------
function scheduleUpdates() {
  if (updateTimer) clearInterval(updateTimer);
  updateTimer = setInterval(updateEngineIncremental, UPDATE_INTERVAL_MS);
  updateTimer.unref(); // não impede que o processo encerre
  console.log(
    `[Adblock] Atualizações automáticas configuradas a cada ${UPDATE_INTERVAL_MS / 3600000}h.`,
  );
}

// ----------------------------------------------------------------------
// setupAdBlocker – configura bloqueio na sessão e retorna o motor
// ----------------------------------------------------------------------
export async function setupAdBlocker(partition) {
  await app.whenReady();

  if (!engine) {
    engine = await createOrLoadEngine();
    scheduleUpdates();
  }

  const targetSession = session.fromPartition(partition);
  await engine.enableBlockingInSession(targetSession);

  // Bloqueia só redes externas de anúncio — NÃO bloqueia endpoints internos do YouTube
  // (bloquear log_event/qoe/ptracking causa loops de anúncio)
  targetSession.webRequest.onBeforeRequest(
    {
      urls: [
        "*://*.doubleclick.net/*",
        "*://*.googlesyndication.com/*",
        "*://*.googleadservices.com/*",
        "*://*.googletagmanager.com/*",
        "*://*.googletagservices.com/*",
        "*://*.youtube.com/pagead/*",
      ],
    },
    (_details, callback) => callback({ cancel: true }),
  );

  console.log(`[Adblock] Bloqueio ativo na partição "${partition}".`);
  return engine;
}

// ----------------------------------------------------------------------
// API pública para forçar atualização manual
// ----------------------------------------------------------------------
export async function forceUpdate() {
  if (!engine) {
    console.warn("[Adblock] Motor não inicializado. Inicie primeiro.");
    return;
  }
  await updateEngineIncremental();
}

// ----------------------------------------------------------------------
// API pública para parar atualizações automáticas (chamar no fechamento do app)
// ----------------------------------------------------------------------
export function stopAutoUpdates() {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
    console.log("[Adblock] Atualizações automáticas interrompidas.");
  }
}
