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

function PlayerApp() {
  const [screen, setScreenState] = useState("player");
  const [screenData, setScreenData] = useState(null); // dados extras
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark",
  );
  const [searchUrl, setSearchUrl] = useState(null);
  const [searchMounted, setSearchMounted] = useState(true);

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
    const savedColor = localStorage.getItem("accent-color");
    if (savedColor)
      document.documentElement.style.setProperty("--accent", savedColor);
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
      {screen === "downloads" && <DownloadScreen setScreen={setScreen} />}

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
