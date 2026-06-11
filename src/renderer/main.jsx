import './index.css' 
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { themes } from "./hooks/themes";

localStorage.removeItem("accent-color");
localStorage.removeItem("player-bg");
localStorage.removeItem("theme-bg");
localStorage.removeItem("theme-contrast");

const savedThemeId = localStorage.getItem("active-theme-id");
const savedTheme = themes.find((t) => t.id === savedThemeId) || themes[0];
document.documentElement.style.setProperty("--accent", savedTheme.accent);
document.documentElement.style.setProperty("--player-bg", savedTheme.gradient);
document.documentElement.style.setProperty("--glass-bg", savedTheme.glassBg);
document.documentElement.style.setProperty("--contrast", savedTheme.contrast);


createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <App />
  // </StrictMode>
)
