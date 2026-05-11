
import { useState } from 'react'
import './App.css'
import { PlayerScreen } from './screens/PlayerScreen'

function App() {

  const [screen, setScreen] = useState('player')
  const [theme, setTheme] = useState('dark')

  return (
      <div className={theme}>
        {screen === "player" && (
          <PlayerScreen />
        )} 
      </div>
  )
}

export default App
