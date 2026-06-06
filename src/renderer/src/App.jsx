import { useState, useEffect } from "react";
import "./App.css";
import { PlayerScreen } from "./screens/PlayerScreen";
import { PlayerProvider } from "./store/PlayerContext";
import { SettingsScreen } from "./screens/SettingsScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { RadioScreen } from "./screens/RadioScreen";
import { useAudio } from "./hooks/useAudio";
import { usePlayerStore } from "./store/playerStore";
import { DownloadScreen } from "./screens/DownloadsScreen";
import { themes } from "./hooks/themes";
import { useDownloadQueue } from "./hooks/useDownloadQueue";
import { Toast } from "./components/Toast";

function PlayerApp() {
  const [screen, setScreenState] = useState("player");
  const [screenData, setScreenData] = useState(null); // dados extras
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark",
  );
  const [searchUrl, setSearchUrl] = useState(null);
  const [searchMounted, setSearchMounted] = useState(true);
  const downloadQueue = useDownloadQueue();
  const toast = usePlayerStore((s) => s.toast);
  const toasts = usePlayerStore((s) => s.toasts);
  const dismissToast = usePlayerStore((s) => s.dismissToast);

  useEffect(() => {
    const handleDone = () => {
      toast({ message: "Download concluído!", type: "success" });
    };
    const handleError = (_, { error }) => {
      toast({ message: "Falha no download: " + error, type: "error" });
    };

    window.electronAPI.downloads.onDone(handleDone);
    window.electronAPI.downloads.onError(handleError);

    return () => {
      window.electronAPI.downloads.removeListeners();
    };
  }, [toast]);

  // Função que substitui setScreen, agora aceita (name, data)
  const setScreen = (name, data) => {
    setScreenState(name);
    setScreenData(data || null);
    if (name === "search") setSearchMounted(true);
  };

  // aplica no body só quando theme muda
  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  // cor também vai pra um useEffect
  useEffect(() => {
    const applyTheme = () => {
      const themeId = localStorage.getItem("active-theme-id");
      const activeTheme = themes.find((t) => t.id === themeId) || themes[0];

      document.documentElement.style.setProperty(
        "--accent",
        activeTheme.accent,
      );
      document.documentElement.style.setProperty(
        "--player-bg",
        activeTheme.gradient,
      );
      document.documentElement.style.setProperty(
        "--glass-bg",
        activeTheme.glassBg ?? "",
      );
    };

    applyTheme(); // aplica na montagem
    window.addEventListener("theme-changed", applyTheme);

    return () => window.removeEventListener("theme-changed", applyTheme);
  }, []);

  useEffect(() => {
    let cancelled = false;
    usePlayerStore
      .getState()
      .syncLibraryWithDatabase()
      .catch((err) => {
        if (!cancelled) console.error("Biblioteca ao iniciar:", err);
      });
    usePlayerStore
      .getState()
      .loadPlaybackSettings()
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useAudio();

  return (
    <div className={theme}>
      {screen === "player" && (
        <PlayerScreen setScreen={setScreen} file={screenData?.song} />
      )}
      {screen === "settings" && (
        <SettingsScreen setScreen={setScreen} setTheme={setTheme} />
      )}
      {screen === "library" && <LibraryScreen setScreen={setScreen} />}
      {screen === "downloads" && (
        <DownloadScreen setScreen={setScreen} downloadQueue={downloadQueue} />
      )}

      {searchMounted ? (
        <div
          style={{
            display: screen === "search" ? "flex" : "none",
            width: "100%",
            height: "100%",
          }}
        >
          <SearchScreen
            setScreen={setScreen}
            searchUrl={searchUrl}
            setSearchUrl={setSearchUrl}
            onClose={() => {
              setSearchMounted(false);
              setSearchUrl(null);
              setScreen("player");
            }}
          />
        </div>
      ) : null}

      {screen === "radio" && <RadioScreen setScreen={setScreen} />}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function App() {
  return (
    <PlayerProvider>
      <PlayerApp />
    </PlayerProvider>
  );
}

export default App;
