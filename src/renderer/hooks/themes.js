import videoNeon from "../assets/neon.mp4";
import videoSunset from "../assets/sunset.mp4";
import videoOcean from "../assets/ocean.mp4";
import videoForest from "../assets/forestVideo.mp4";
import sand from "../assets/sand.mp4";
import grafite from "../assets/grafite.mp4";
import rainy from "../assets/rainy.mp4";
import sakura from "../assets/sakura.mp4";
import yellow from "../assets/yellow.mp4";
import wood from "../assets/wood.mp4";
import deep from "../assets/deep.mp4";
import ambar from "../assets/ambar.mp4";

export const themes = [
  // Neon Theme
  {
    id: "neon",
    name: "Neon",
    accent: "#6a00ff",
    contrast: "#fff",
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

  // Sakura Theme
  {
    id: "sakura",
    name: "Sakura",
    accent: "#ff6b9d",
    contrast: "#fff",
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

  // Rainy Theme
  {
    id: "rainy",
    name: "Rainy",
    accent: "#3b82f6",
    contrast: "#fff",
    video: rainy,

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

  // Sand Theme
  {
    id: "sand",
    name: "Sand",
    accent: "#ad9770ff",
    contrast: "#fff",
    video: sand,

    glassBg: `
    linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.26),
      rgba(0, 0, 0, 1)
    )
  `,

    gradient: `
    radial-gradient(circle at 20% 30%, #c4b293ff 0%, transparent 35%),
    radial-gradient(circle at 80% 20%, #b9b87eff 0%, transparent 30%),
    radial-gradient(circle at 60% 80%, #d6b052ff 0%, transparent 40%),
    radial-gradient(circle at 30% 70%, #c7a86eff 0%, transparent 35%)
  `,
  },

  // Yellow Theme
  {
    id: "yellow",
    name: "Yellow",
    accent: "#fbbf24",
    contrast: "#ffffffff",
    video: yellow,

    glassBg: `
    linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.26),
      rgba(0, 0, 0, 1)
    )
  `,

    gradient: `
    radial-gradient(circle at 20% 30%, #fff75e 0%, transparent 35%),
    radial-gradient(circle at 80% 20%, #ffe94e 0%, transparent 30%),
    radial-gradient(circle at 60% 80%, #fdc43f 0%, transparent 40%),
    radial-gradient(circle at 30% 70%, #fdb833 0%, transparent 35%)
  `,
  },

  // Graphite Theme
  {
    id: "graphite",
    name: "Graphite",
    accent: "#757c87ff",
    contrast: "#fff",
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

  // Sunset Theme
  {
    id: "sunset",
    name: "Sunset",
    accent: "#ff1500",
    contrast: "#fff",
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
      radial-gradient(circle at 80% 20%, #ff0000ff 0%, transparent 30%),
      radial-gradient(circle at 60% 80%, #ff4d00 0%, transparent 40%),
      radial-gradient(circle at 30% 70%, #9e0606ff 0%, transparent 35%)
    `,
  },

  // Ocean Theme
  {
    id: "ocean",
    name: "Ocean",
    accent: "#00aeffff",
    contrast: "#fff",
    video: videoOcean,
    gradient: `
      radial-gradient(circle at 20% 30%, #00d4ff 0%, transparent 35%),
      radial-gradient(circle at 80% 20%, #0066ff 0%, transparent 30%),
      radial-gradient(circle at 60% 80%, #00a2ff 0%, transparent 40%),
      radial-gradient(circle at 30% 70%, #00fff2 0%, transparent 35%)
    `,
  },

  // Forest Theme
  {
    id: "forest",
    name: "Forest",
    accent: "#1DB954",
    contrast: "#fff",
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
      radial-gradient(circle at 30% 70%, #0f7d1eff 0%, transparent 35%)
    `,
  },

  // Amber Night Theme
  {
    id: "amber-night",
    name: "Amber Night",
    accent: "#E0D68A",
    video: ambar,
    contrast: "#751e44ff",
    glassBg: `
    linear-gradient(
      135deg,
      rgba(50, 10, 40, 0.35),
      rgba(0, 0, 0, 1)
    )
  `,

    gradient: `
    radial-gradient(circle at 20% 30%, #511730 0%, transparent 35%),
    radial-gradient(circle at 80% 20%, #8E443D 0%, transparent 30%),
    radial-gradient(circle at 60% 80%, #CB9173 0%, transparent 40%),
    radial-gradient(circle at 30% 70%, #E0D68A 0%, transparent 25%),
    radial-gradient(circle at 50% 50%, #320A28 0%, transparent 70%)
  `,
  },

  // Bloodwood Forest Theme
  {
    id: "bloodwood-forest",
    name: "Bloodwood Forest",
    accent: "#CC3F0C",
    contrast: "#D8CBC7",
    video: deep,
    glassBg: `
    linear-gradient(
      135deg,
      rgba(25, 35, 26, 0.35),
      rgba(0, 0, 0, 1)
    )
  `,
    gradient: `
    radial-gradient(circle at 20% 30%, #33673B 0%, transparent 35%),
    radial-gradient(circle at 80% 20%, #9A6D38 0%, transparent 30%),
    radial-gradient(circle at 60% 80%, #CC3F0C 0%, transparent 25%),
    radial-gradient(circle at 30% 70%, #D8CBC7 0%, transparent 20%),
    radial-gradient(circle at 50% 50%, #19231A 0%, transparent 75%)
  `,
  },

  // Deep Ocean Alert Theme
  {
    id: "deep-ocean-alert",
    name: "Deep Ocean",
    video: wood,
    accent: "#EE2E31",
    contrast: "#fff",

    glassBg: `
    linear-gradient(
      135deg,
      rgba(7, 30, 34, 0.4),
      rgba(0, 0, 0, 1)
    )
  `,
    gradient: `
    radial-gradient(circle at 20% 30%, #1D7874 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, #679289 0%, transparent 28%),
    radial-gradient(circle at 60% 80%, #F4C095 0%, transparent 35%),
    radial-gradient(circle at 30% 70%, #EE2E31 0%, transparent 20%),
    radial-gradient(circle at 50% 50%, #071E22 0%, transparent 70%)
  `,
  },
];
