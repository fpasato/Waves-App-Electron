import { useState } from 'react'
import './App.css'

import { PlayerScreen } from './screens/PlayerScreen'
import { PlayerProvider } from './store/PlayerContext'
import { SettingsScreen } from './screens/SettingsScreen'
import { LibraryScreen } from './screens/LibraryScreen'
import { useAudio } from './hooks/useAudio'

function PlayerApp() {
  const [screen, setScreen] = useState('player')
  const [theme, setTheme] = useState('dark')

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