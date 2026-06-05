import videoNeon from "../assets/neon.mp4";
import videoSunset from "../assets/sunset.mp4";
import videoOcean from "../assets/ocean.mp4";
import videoForest from "../assets/forestVideo.mp4";
import videoGold from "../assets/gold.mp4";
import grafite from "../assets/grafite.mp4";
import obsidian from "../assets/obsidian.mp4";
import sakura from "../assets/sakura.mp4";

export const themes = [
  {
    id: "neon",
    name: "Neon",
    accent: "#6a00ff",
    video: videoNeon,

    glassBg: `
    linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.26),
      rgba(0, 0, 0, 1)
    )
  `,

    gradient: `
      radial-gradient(circle at 20% 30%, #6a00ff 0%, transparent 35%),
      radial-gradient(circle at 80% 20%, #0024c7 0%, transparent 30%),
      radial-gradient(circle at 60% 80%, #8f00ff 0%, transparent 40%),
      radial-gradient(circle at 30% 70%, #0035c6 0%, transparent 35%)
    `,
  },

  {
    id: "sakura",
    name: "Sakura",
    accent: "#ff6b9d",
    video: sakura,

    glassBg: `
    linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.26),
      rgba(0, 0, 0, 1)
    )
  `,

    gradient: `
    radial-gradient(circle at 20% 30%, #ff6b9d 0%, transparent 35%),
    radial-gradient(circle at 80% 20%, #ffb3d9 0%, transparent 30%),
    radial-gradient(circle at 60% 80%, #ff4f81 0%, transparent 40%),
    radial-gradient(circle at 30% 70%, #ffc2d1 0%, transparent 35%)
  `,
  },
  {
    id: "obsidian",
    name: "Obsidian",
    accent: "#3b82f6",
    video: obsidian,

    glassBg: `
    linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.26),
      rgba(0, 0, 0, 1)
    )
  `,

    gradient: `
    radial-gradient(circle at 20% 30%, #1e3a8a 0%, transparent 35%),
    radial-gradient(circle at 80% 20%, #172554 0%, transparent 30%),
    radial-gradient(circle at 60% 80%, #2563eb 0%, transparent 40%),
    radial-gradient(circle at 30% 70%, #0f172a 0%, transparent 35%)
  `,
  },
  {
    id: "crimson-gold",
    name: "Crimson Gold",
    accent: "#f59e0b",
    video: videoGold,

    glassBg: `
    linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.26),
      rgba(0, 0, 0, 1)
    )
  `,

    gradient: `
    radial-gradient(circle at 20% 30%, #f59e0b 0%, transparent 35%),
    radial-gradient(circle at 80% 20%, #dc2626 0%, transparent 30%),
    radial-gradient(circle at 60% 80%, #fbbf24 0%, transparent 40%),
    radial-gradient(circle at 30% 70%, #ef4444 0%, transparent 35%)
  `,
  },
  {
    id: "graphite",
    name: "Graphite",
    accent: "#757c87ff",
    video: grafite,

    glassBg: `
    linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.26),
      rgba(0, 0, 0, 1)
    )
  `,
    gradient: `
    radial-gradient(circle at 20% 30%, #475569 0%, transparent 35%),
    radial-gradient(circle at 80% 20%, #334155 0%, transparent 30%),
    radial-gradient(circle at 60% 80%, #64748b 0%, transparent 40%),
    radial-gradient(circle at 30% 70%, #1e293b 0%, transparent 35%)
  `,
  },
  {
    id: "sunset",
    name: "Sunset",
    accent: "#ff1500",
    video: videoSunset,

    glassBg: `
    linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.26),
      rgba(0, 0, 0, 1)
    )
  `,

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
    accent: "#00aeffff",
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

    glassBg: `
    linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.26),
      rgba(0, 0, 0, 1)
    )
  `,

    video: videoForest,
    gradient: `
      radial-gradient(circle at 20% 30%, #1DB954 0%, transparent 35%),
      radial-gradient(circle at 80% 20%, #05cf31ff 0%, transparent 30%),
      radial-gradient(circle at 60% 80%, #2d6a4f 0%, transparent 40%),
      radial-gradient(circle at 30% 70%, #00ffbfff 0%, transparent 35%)
    `,
  },
];
