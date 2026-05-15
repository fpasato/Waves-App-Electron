import { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./style.module.css";
import { usePlayer } from "../../store/PlayerContext";

const accent = getComputedStyle(document.body)
  .getPropertyValue("--accent")
  .trim();

// ==================== TEXTURA DE BRILHO (GLOW) ====================
const createGlowTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.15, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.35, "rgba(220,235,255,0.85)");
  gradient.addColorStop(0.6, "rgba(140,180,255,0.25)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
};

const GLOW_TEXTURE = createGlowTexture();

// ==================== COMPONENTE PRINCIPAL ====================
export function ParticlesEffect() {
  const containerRef = useRef(null);
  const { analyserRef } = usePlayer();
  const overlayCanvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ========== 1. CENA DE PARTÍCULAS 3D ==========
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.zIndex = "1";
    container.appendChild(renderer.domElement);

    const COUNT = 4000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const basePositions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = basePositions[i3] = (Math.random() - 0.5) * 25;
      positions[i3 + 1] = basePositions[i3 + 1] = (Math.random() - 0.5) * 25;
      positions[i3 + 2] = basePositions[i3 + 2] = Math.random() * -100;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.25,
      map: GLOW_TEXTURE,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);

    // ========== 2. ÁUDIO + DETECTOR DE BATIDAS ==========
    const analyser = analyserRef.current;
    let dataArray = null;
    if (analyser) {
      analyser.smoothingTimeConstant = 0.8;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
    let smoothedBass = 0;
    let smoothedMid = 0;
    let lastMidDiff = 0;        // Guarda a diferença do frame anterior
    let beatThreshold = 0.12;   // Limiar ajustável (sensibilidade da batida)

    const waves = [];
    let lastWaveSpawn = 0;

    // ========== 3. OVERLAY 2D ==========
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = overlayCanvas.getContext("2d");
    overlayCanvas.style.position = "absolute";
    overlayCanvas.style.top = "0";
    overlayCanvas.style.left = "0";
    overlayCanvas.style.width = "100%";
    overlayCanvas.style.height = "100%";
    overlayCanvas.style.pointerEvents = "none";
    overlayCanvas.style.zIndex = "2";
    container.appendChild(overlayCanvas);

    const BAR_COUNT = 200;
    let smoothedHeights = new Array(BAR_COUNT).fill(0);
    const smoothing = 0.5;
    const maxFreqIndex = 80;

    const resizeOverlay = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (overlayCanvas.width !== w) overlayCanvas.width = w;
      if (overlayCanvas.height !== h) overlayCanvas.height = h;
      ctx.imageSmoothingEnabled = true;
    };
    const resizeObserver = new ResizeObserver(resizeOverlay);
    resizeObserver.observe(container);

    // ========== 4. LOOP DE ANIMAÇÃO ==========
    let animationId;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Processa áudio
      let bass = 0;
      let mid = 0;
      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        // Graves (0-39)
        for (let i = 0; i < 40; i++) bass += dataArray[i];
        bass = bass / 40 / 255;
        // Médios (faixa que contém batidas de caixa e ataque de kicks médios)
        let midCount = 0;
        for (let i = 30; i <= 80 && i < dataArray.length; i++) {
          mid += dataArray[i];
          midCount++;
        }
        mid = mid / midCount / 255;
      }
      smoothedBass = smoothedBass * 0.82 + bass * 0.18;
      smoothedMid = smoothedMid * 0.85 + mid * 0.15;

      // --- DETECTOR DE BATIDAS (diferença brusca) ---
      const midDiff = mid - smoothedMid;        // diferença entre o atual e o suavizado
      const isBeat = (midDiff > beatThreshold && midDiff > lastMidDiff * 0.8);
      lastMidDiff = midDiff;

      const force = smoothedBass * 5;
      const time = performance.now() * 0.001;

      // --- Partículas 3D (mantido) ---
      const posAttr = geometry.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        posAttr[i3 + 2] += 0.02 + force * 0.07;
        if (posAttr[i3 + 2] > 5) posAttr[i3 + 2] = -100;
        posAttr[i3] = basePositions[i3] + Math.sin(time + i * 0.06) * force;
        posAttr[i3 + 1] = basePositions[i3 + 1] + Math.cos(time + i * 0.06) * force;
      }
      geometry.attributes.position.needsUpdate = true;
      particleMaterial.size = 0.15 + smoothedBass * 0.2;
      particleMaterial.opacity = 0.5 + smoothedBass * 1.5;
      camera.position.z = 5 - smoothedBass * 0.7;
      renderer.render(scene, camera);

      // --- Desenho do overlay ---
      const w = overlayCanvas.width;
      const h = overlayCanvas.height;
      const centerX = w / 2;
      const centerY = h / 2;
      const circleBaseRadius = Math.min(w, h) * 0.17;

      ctx.clearRect(0, 0, w, h);

      // ========== SPAWN DE ONDAS (SOMENTE NAS BATIDAS) ==========
      const now = performance.now();
      if (isBeat) {
        // Usa a intensidade da batida (midDiff) para modular os parâmetros
        const beatStrength = Math.min(0.8, midDiff * 1.5);
        // Evita spawn excessivo com um cooldown mínimo de 100ms
        if (now - lastWaveSpawn > 100) {
          waves.push({
            r: circleBaseRadius,
            opacity: 0.8 + beatStrength * 0.3,
            speed: 1.5 + beatStrength * 4,
            bass: beatStrength,      // guarda a força da batida
            seed: Math.random() * 100,
          });
          lastWaveSpawn = now;
        }
      }

      // ========== DESENHO DAS ONDAS (mesmo estilo, usando a força da batida) ==========
      ctx.globalCompositeOperation = "lighter";

      for (let i = waves.length - 1; i >= 0; i--) {
        const wave = waves[i];
        wave.r += wave.speed;
        wave.opacity *= 0.94;

        if (wave.opacity < 0.015) {
          waves.splice(i, 1);
          continue;
        }

        const maxR = circleBaseRadius * 4;
        const progress = (wave.r - circleBaseRadius) / (maxR - circleBaseRadius);
        const alpha = wave.opacity * (1 - progress * 0.5);

        ctx.beginPath();
        const points = 80;
        for (let j = 0; j <= points; j++) {
          const angle = (j / points) * Math.PI * 2;
          const noise =
            Math.sin(angle * 7 + time * 4 + wave.seed) * (18 * wave.bass) +
            Math.cos(angle * 4 - time * 2 + wave.seed) * (8 * (1 - progress));
          const currentRadius = wave.r + noise;
          const x = centerX + Math.cos(angle) * currentRadius;
          const y = centerY + Math.sin(angle) * currentRadius;
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const thickness = (25 + wave.bass * 40) * (1 - progress);
        ctx.lineWidth = thickness;
        ctx.strokeStyle = `rgba(100, 150, 255, ${alpha * 0.15})`;
        ctx.shadowBlur = 40;
        ctx.shadowColor = `rgba(140, 200, 255, ${alpha})`;
        ctx.stroke();

        ctx.lineWidth = 2 + wave.bass * 6;
        ctx.strokeStyle = `rgba(220, 240, 255, ${alpha * 0.8})`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ffffff";
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.shadowBlur = 0;

      // ========== ANÉIS DECORATIVOS (reações aos graves, mantido) ==========
      for (let j = 0; j < 4; j++) {
        ctx.beginPath();
        const points = 120;
        for (let i = 0; i <= points; i++) {
          const a = (i / points) * Math.PI * 2;
          const noise =
            Math.sin(a * 6 + time * 1.5 + j) * 8 +
            Math.cos(a * 4 - time * 1.2 + j) * 6;
          const radius =
            circleBaseRadius * (0.55 + j * 0.12) + noise + smoothedBass * 18;
          const x = centerX + Math.cos(a) * radius;
          const y = centerY + Math.sin(a) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255,255,255,${0.15 - j * 0.03})`;
        ctx.lineWidth = 3 + smoothedBass * 4;
        ctx.shadowBlur = 30 + smoothedBass * 40;
        ctx.shadowColor = "rgba(180,220,255,0.8)";
        ctx.stroke();
      }

      // ========== ESFERA CENTRAL ==========
      const coreGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        circleBaseRadius,
      );
      coreGradient.addColorStop(0, "rgba(255,255,255,1)");
      coreGradient.addColorStop(0.1, "rgba(255,255,255,0.95)");
      coreGradient.addColorStop(0.25, "rgba(180,220,255,0.9)");
      coreGradient.addColorStop(0.5, "rgba(100,140,255,0.3)");
      coreGradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleBaseRadius * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      // ========== BARRAS RADIAIS ==========
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#ffffffff";
      for (let i = 0; i < BAR_COUNT; i++) {
        let targetHeight = 0;
        if (dataArray) {
          const freqIndex = Math.floor((i / BAR_COUNT) * maxFreqIndex);
          targetHeight = ((dataArray[freqIndex] || 0) / 255) * 40;
        }
        smoothedHeights[i] =
          smoothedHeights[i] * smoothing + targetHeight * (1 - smoothing);
        const barHeight = Math.max(4, smoothedHeights[i]);

        const angle = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
        const innerR = circleBaseRadius + 10;
        const outerR = innerR + barHeight;
        const x1 = centerX + Math.cos(angle) * innerR;
        const y1 = centerY + Math.sin(angle) * innerR;
        const x2 = centerX + Math.cos(angle) * outerR;
        const y2 = centerY + Math.sin(angle) * outerR;

        ctx.beginPath();
        ctx.lineWidth = Math.max(2, (w / BAR_COUNT) * 0.8);
        ctx.lineCap = "butt";
        ctx.strokeStyle = "#ffffff";
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };

    animate();

    // ========== 5. RESIZE E CLEANUP ==========
    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      resizeOverlay();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      geometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
      if (overlayCanvas.parentNode)
        overlayCanvas.parentNode.removeChild(overlayCanvas);
    };
  }, [analyserRef]);

  return (
    <div className={styles.particlesEffectContainer} ref={containerRef}>
      <canvas
        ref={overlayCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}