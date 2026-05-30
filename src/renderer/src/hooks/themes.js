import videoNeon from "../assets/neon.mp4";
import videoSunset from "../assets/sunset.mp4";
import videoOcean from "../assets/ocean.mp4";
import videoForest from "../assets/forestVideo.mp4";
import videoGold from "../assets/gold.mp4";

export const themes = [
  {
    id: "neon",
    name: "Neon",
    accent: "#6a00ff",
    video: videoNeon,
    gradient: `
      radial-gradient(circle at 20% 30%, #6a00ff 0%, transparent 35%),
      radial-gradient(circle at 80% 20%, #0024c7 0%, transparent 30%),
      radial-gradient(circle at 60% 80%, #8f00ff 0%, transparent 40%),
      radial-gradient(circle at 30% 70%, #0035c6 0%, transparent 35%)
    `,
  },
  {
    id: "sunset",
    name: "Sunset",
    accent: "#ff1500",
    video: videoSunset,
    gradient: `
      radial-gradient(circle at 20% 30%, #ff7b00 0%, transparent 35%),
      radial-gradient(circle at 80% 20%, #ff0055 0%, transparent 30%),
      radial-gradient(circle at 60% 80%, #ff4d00 0%, transparent 40%),
      radial-gradient(circle at 30% 70%, #ffb300 0%, transparent 35%)
    `,
  },
  {
    id: "ocean",
    name: "Ocean",
    accent: "#00d4ff",
    video: videoOcean,
    gradient: `
      radial-gradient(circle at 20% 30%, #00d4ff 0%, transparent 35%),
      radial-gradient(circle at 80% 20%, #0066ff 0%, transparent 30%),
      radial-gradient(circle at 60% 80%, #00a2ff 0%, transparent 40%),
      radial-gradient(circle at 30% 70%, #00fff2 0%, transparent 35%)
    `,
  },
  {
    id: "forest",
    name: "Forest",
    accent: "#1DB954",
    video: videoForest,
    gradient: `
      radial-gradient(circle at 20% 30%, #1DB954 0%, transparent 35%),
      radial-gradient(circle at 80% 20%, #00ff37 0%, transparent 30%),
      radial-gradient(circle at 60% 80%, #2d6a4f 0%, transparent 40%),
      radial-gradient(circle at 30% 70%, #b7e4c7 0%, transparent 35%)
    `,
  },
  {
    id: "gold",
    name: "Aurora",
    accent: "#e4b61a",
    video: videoGold,
    gradient: `
      radial-gradient(circle at 20% 30%, #e4b61a 0%, transparent 35%),
      radial-gradient(circle at 80% 20%, #fffc9c 0%, transparent 30%),
      radial-gradient(circle at 60% 80%, #fbe134 0%, transparent 40%),
      radial-gradient(circle at 30% 70%, #ffee00 0%, transparent 35%)
    `,
  },
];