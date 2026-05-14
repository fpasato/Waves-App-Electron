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
    // 🔥 NÃO bloqueia mais a criação da cena se analyser for nulo
    if (!container) return;

    // ----- 1. SETUP THREE.JS (partículas 3D de fundo) -----
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
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Partículas (4000 pontos)
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
      opacity: 1,
    });
    const particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);

    // ----- 2. LÓGICA DE ÁUDIO – AGORA PROTEGIDA -----
    const analyser = analyserRef.current;
    let dataArray = null;
    if (analyser) {
      analyser.smoothingTimeConstant = 0.8;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
    let smoothedBass = 0;

    // ----- 3. OVERLAY 2D (círculo + barras radiais) -----
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = overlayCanvas.getContext("2d");
    overlayCanvas.style.position = "absolute";
    overlayCanvas.style.top = "0";
    overlayCanvas.style.left = "0";
    overlayCanvas.style.width = "100%";
    overlayCanvas.style.height = "100%";
    overlayCanvas.style.pointerEvents = "none";
    container.style.position = "relative";
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

    // ----- 4. LOOP DE ANIMAÇÃO (seguro) -----
    let threeAnimationId;

    const animate = () => {
      threeAnimationId = requestAnimationFrame(animate);

      // --- Atualiza o grave suavizado (se houver analyser) ---
      let bass = 0;
      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        for (let i = 0; i < 40; i++) bass += dataArray[i];
        bass = bass / 40 / 255;
      }
      smoothedBass = smoothedBass * 0.82 + bass * 0.18;
      const force = smoothedBass * 5;
      const time = performance.now() * 0.001;

      // --- Atualiza as partículas 3D (sempre rodam, mas com força do áudio) ---
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

      // --- Desenha o overlay 2D (sempre desenha, mas com dados do áudio ou zero) ---
      const w = overlayCanvas.width;
      const h = overlayCanvas.height;
      const centerX = w / 2;
      const centerY = h / 2;
      const circleBaseRadius = Math.min(w, h) * 0.17;

      ctx.clearRect(0, 0, w, h);

      // Círculo com pulso (usa smoothedBass, que pode ser 0 se não houver áudio)
      const circleScale = 1 + smoothedBass * 0.3;
      const circleRadius = circleBaseRadius * circleScale;

      // Anéis decorativos (sempre desenha)
      for (let j = 0; j < 4; j++) {
        ctx.beginPath();
        const points = 120;
        for (let i = 0; i <= points; i++) {
          const a = (i / points) * Math.PI * 2;
          const noise = Math.sin(a * 6 + time * 1.5 + j) * 8 +
                        Math.cos(a * 4 - time * 1.2 + j) * 6;
          const radius = circleRadius * (0.55 + j * 0.12) + noise + smoothedBass * 18;
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

      // Gradiente do núcleo
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, circleRadius);
      coreGradient.addColorStop(0, "rgba(255,255,255,1)");
      coreGradient.addColorStop(0.1, "rgba(255,255,255,0.95)");
      coreGradient.addColorStop(0.25, "rgba(180,220,255,0.9)");
      coreGradient.addColorStop(0.5, "rgba(100,140,255,0.3)");
      coreGradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      // Barras radiais (protegidas: se não houver dataArray, usa smoothedHeights zerados)
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffffffff';
      for (let i = 0; i < BAR_COUNT; i++) {
        let targetHeight = 0;
        if (dataArray) {
          const freqIndex = Math.floor((i / BAR_COUNT) * maxFreqIndex);
          const rawValue = dataArray[freqIndex] || 0;
          targetHeight = (rawValue / 255) * 40;
        }
        smoothedHeights[i] = smoothedHeights[i] * smoothing + targetHeight * (1 - smoothing);
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
        ctx.strokeStyle = '#ffffff';
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };

    animate();

    // ----- 5. RESIZE E CLEANUP -----
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
      cancelAnimationFrame(threeAnimationId);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      geometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
      if (overlayCanvas.parentNode) overlayCanvas.parentNode.removeChild(overlayCanvas);
    };
  }, [analyserRef]); // dependência mantida, mas a cena é criada mesmo sem analyser

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