import { useState, useEffect, useRef } from "react";
import "./App.css";
import { PlayerScreen } from "./screens/PlayerScreen";
import { PlayerProvider } from "./store/PlayerContext";
import { SettingsScreen } from "./screens/SettingsScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { RadioScreen } from "./screens/RadioScreen";
import { VideoPlayerScreen } from "./screens/VideoPlayerScreen";
import { PlaylistScreen } from "./screens/PlaylistScreen";
import { RecentScreen } from "./screens/RecentScreen";
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
  const activeTheme = usePlayerStore((s) => s.activeTheme);
  const downloadListenersRef = useRef(null);

  useEffect(() => {
    if (downloadListenersRef.current) {
      return;
    }

    const handleDone = (_, { id }) => {
      toast({ message: "Download concluído!", type: "success" });
    };
    const handleError = (_, { error }) => {
      toast({ message: "Falha no download: " + error, type: "error" });
    };

    window.electronAPI.downloads.onDone(handleDone);
    window.electronAPI.downloads.onError(handleError);

    downloadListenersRef.current = { handleDone, handleError };
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
  
  useEffect(() => {
    const root = document.querySelector(".dark") ?? document.documentElement;
    root.style.setProperty("--accent1", activeTheme.accent1);
    root.style.setProperty("--accent2", activeTheme.accent2);
  }, [activeTheme]);

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
      {screen === "videoplayer" && (
        <VideoPlayerScreen setScreen={setScreen} video={screenData?.video} />
      )}
      {screen === "playlist" && <PlaylistScreen setScreen={setScreen} />}
      {screen === "recents" && <RecentScreen setScreen={setScreen} />}
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
