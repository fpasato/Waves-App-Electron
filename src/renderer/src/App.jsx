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

function PlayerApp() {
  const [screen, setScreen] = useState("player");
  const [theme, setTheme] = useState("dark");
  const [searchUrl, setSearchUrl] = useState(null);
  const [searchMounted, setSearchMounted] = useState(true);

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
  useEffect(() => {
    if (screen === "search") setSearchMounted(true);
  }, [screen]);

  return (
    <div className={theme}>
      {screen === "player" && <PlayerScreen setScreen={setScreen} />}
      {screen === "settings" && <SettingsScreen setScreen={setScreen} />}
      {screen === "library" && <LibraryScreen setScreen={setScreen} />}

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
