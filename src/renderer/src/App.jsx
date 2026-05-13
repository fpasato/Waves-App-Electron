import { useState, useEffect } from 'react'
import './App.css'

import { PlayerScreen } from './screens/PlayerScreen'
import { PlayerProvider } from './store/PlayerContext'
import { SettingsScreen } from './screens/SettingsScreen'
import { LibraryScreen } from './screens/LibraryScreen'
import { useAudio } from './hooks/useAudio'
import { usePlayerStore } from './store/playerStore'

function PlayerApp() {
  const [screen, setScreen] = useState('player')
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    let cancelled = false
    usePlayerStore
      .getState()
      .syncLibraryWithDatabase()
      .catch((err) => {
        if (!cancelled) console.error('Biblioteca ao iniciar:', err)
      })
    usePlayerStore.getState().loadPlaybackSettings().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useAudio()

  return (
    <div className={theme}>
      {screen === "player" && <PlayerScreen setScreen={setScreen} />}
      {screen === "settings" && <SettingsScreen setScreen={setScreen} />}
      {screen === "library" && <LibraryScreen setScreen={setScreen} />}
    </div>
  )
}

function App() {
  return (
    <PlayerProvider>
      <PlayerApp />
    </PlayerProvider>
  )
}

export default App