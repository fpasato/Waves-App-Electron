import { useState } from 'react'
import { Header } from '../../Components/Header'
import styles from './style.module.css'
import { usePlayer } from '../../store/PlayerContext'

export function SettingsScreen({ setScreen }) {
  const { dispatch } = usePlayer()
  const [tab, setTab] = useState('directories')
  const [directories, setDirectories] = useState([])
  const [status, setStatus] = useState('')

  async function handleAddFolder() {
    const folder = await window.musicAPI.selectFolder()
    if (!folder) return
    if (directories.includes(folder)) {
      setStatus('⚠️ Pasta já adicionada')
      return
    }

    setStatus('⏳ Escaneando...')
    const tracks = await window.musicAPI.scanFolder(folder)
    dispatch({ type: 'SET_LIBRARY', payload: tracks })
    setDirectories(prev => [...prev, folder])
    setStatus(`✅ ${tracks.length} músicas encontradas`)
  }

  function handleRemoveFolder(dir) {
    setDirectories(prev => prev.filter(d => d !== dir))
    setStatus('🗑️ Pasta removida')
  }

  return (
    <div className={styles.settingsScreen}>
      <Header title="Configurações" />

      <div className={styles.container}>
        <nav className={styles.sidebar}>
          <button
            className={`${styles.tab} ${tab === 'directories' ? styles.active : ''}`}
            onClick={() => setTab('directories')}
          >
            Diretórios
          </button>
          <button
            className={`${styles.tab} ${tab === 'playback' ? styles.active : ''}`}
            onClick={() => setTab('playback')}
          >
            Playback
          </button>
          <button onClick={() => setScreen('player')}>Voltar</button>
        </nav>

        <div className={styles.content}>
          {tab === 'directories' && (
            <div className={styles.section}>
              <h2>Diretórios de Música</h2>
              <p>Pastas que o app irá escanear.</p>

              <button className={styles.addButton} onClick={handleAddFolder}>
                + Adicionar pasta
              </button>

              {status && <p className={styles.status}>{status}</p>}

              <ul className={styles.list}>
                {directories.length === 0 ? (
                  <p className={styles.empty}>Nenhuma pasta adicionada.</p>
                ) : (
                  directories.map(dir => (
                    <li key={dir} className={styles.dirItem}>
                      <span>{dir}</span>
                      <button onClick={() => handleRemoveFolder(dir)}>Remover</button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {tab === 'playback' && (
            <div className={styles.section}>
              <h2>Playback</h2>
              <p>Em breve.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}