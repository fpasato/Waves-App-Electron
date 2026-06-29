import { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./style.module.css";
import { usePlayer } from "../../../store/PlayerContext";

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
  return new THREE.CanvasTexture(canvas);
};

const GLOW_TEXTURE = createGlowTexture();

// ==================== SHADERS DO RASTRO ====================
const trailVertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  varying float vAlpha;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / abs(mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;
    vAlpha = aAlpha;
  }
`;

const trailFragmentShader = `
  uniform sampler2D uTexture;
  varying float vAlpha;

  void main() {
    vec4 tex = texture2D(uTexture, gl_PointCoord);
    if (tex.a < 0.01) discard;
    gl_FragColor = vec4(tex.rgb, tex.a * vAlpha);
  }
`;

// ==================== COMPONENTE PRINCIPAL ====================
export function ParticlesEffect() {
  const containerRef = useRef(null);
  const { analyserRef } = usePlayer();
  const overlayCanvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ========== 1. CENA 3D ==========
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
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

    // ========== PARTÍCULAS PRINCIPAIS ==========
    const COUNT = 1000;
    const TRAIL_LENGTH = 30; // rastro bem mais longo

    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const basePositions = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      positions[i3]     = basePositions[i3]     = (Math.random() - 0.5) * 25;
      positions[i3 + 1] = basePositions[i3 + 1] = (Math.random() - 0.5) * 25;
      positions[i3 + 2] = basePositions[i3 + 2] = Math.random() * -100;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.25,
      map: GLOW_TEXTURE,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // ========== RASTRO 3D (longo e fino) ==========
    const trailHistory = new Float32Array(COUNT * TRAIL_LENGTH * 3);
    const trailIndex = new Uint16Array(COUNT);

    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(COUNT * TRAIL_LENGTH * 3);
    const trailSizes = new Float32Array(COUNT * TRAIL_LENGTH);
    const trailAlphas = new Float32Array(COUNT * TRAIL_LENGTH);

    trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setAttribute("aSize",    new THREE.BufferAttribute(trailSizes, 1));
    trailGeometry.setAttribute("aAlpha",   new THREE.BufferAttribute(trailAlphas, 1));

    const trailMaterial = new THREE.ShaderMaterial({
      uniforms: { uTexture: { value: GLOW_TEXTURE } },
      vertexShader: trailVertexShader,
      fragmentShader: trailFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const trailPoints = new THREE.Points(trailGeometry, trailMaterial);
    scene.add(trailPoints);

    // ========== 2. ÁUDIO + DETECTOR DE BATIDAS ==========
    const analyser = analyserRef.current;
    let dataArray = null;
    if (analyser) {
      analyser.smoothingTimeConstant = 0.8;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
    let smoothedBass = 0;
    let smoothedMid = 0;
    let lastMidDiff = 0;
    const beatThreshold = 0.12;

    const waves = [];
    let lastWaveSpawn = 0;
    let beatFlash = 0; // controle de flash nas batidas

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

    const BAR_COUNT = 150;
    const smoothedHeights = new Array(BAR_COUNT).fill(0);
    const smoothing = 0.04;
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

      renderer.clear();

      // --- Áudio ---
      let bass = 0;
      let mid = 0;
      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        for (let i = 0; i < 40; i++) bass += dataArray[i];
        bass /= 40 * 255;
        let midCount = 0;
        for (let i = 30; i <= 80 && i < dataArray.length; i++) {
          mid += dataArray[i];
          midCount++;
        }
        mid /= midCount * 255;
      }
      smoothedBass = smoothedBass * 0.82 + bass * 0.18;
      smoothedMid  = smoothedMid  * 0.85 + mid  * 0.15;

      const midDiff = mid - smoothedMid;
      const isBeat  = midDiff > beatThreshold && midDiff > lastMidDiff * 0.8;
      lastMidDiff = midDiff;

      // Flash de batida: dispara e decai
      if (isBeat) beatFlash = 1.0;
      beatFlash *= 0.92; // decaimento rápido

      const force = smoothedBass * 5;
      const time  = performance.now() * 0.001;

      // --- Atualiza partículas e alimenta histórico do rastro ---
      const posAttr = particleGeometry.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;

        posAttr[i3 + 2] += 0.02 + force * 0.07;
        if (posAttr[i3 + 2] > 5) posAttr[i3 + 2] = -100;
        posAttr[i3]     = basePositions[i3]     + Math.sin(time + i * 0.06) * force;
        posAttr[i3 + 1] = basePositions[i3 + 1] + Math.cos(time + i * 0.06) * force;

        // Grava posição atual no buffer circular
        const idx  = trailIndex[i];
        const base = i * TRAIL_LENGTH * 3 + idx * 3;
        trailHistory[base]     = posAttr[i3];
        trailHistory[base + 1] = posAttr[i3 + 1];
        trailHistory[base + 2] = posAttr[i3 + 2];
        trailIndex[i] = (idx + 1) % TRAIL_LENGTH;
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Partícula principal: tamanho sutil, mas opacidade reage fortemente ao áudio + flash
      const particleOpacity = 0.3 + smoothedBass * 2.0 + beatFlash * 0.8;
      particleMaterial.size    = 0.18 + smoothedBass * 0.25; // tamanho cresce pouco
      particleMaterial.opacity = Math.min(2.5, particleOpacity); // brilho intenso
      camera.position.z = 5 - smoothedBass * 0.5;

      // --- Reconstrói geometria do rastro (longo, fino e com ponta brilhante) ---
      for (let i = 0; i < COUNT; i++) {
        const currentIdx = trailIndex[i];
        for (let j = 0; j < TRAIL_LENGTH; j++) {
          const histIdx = (currentIdx - 1 - j + TRAIL_LENGTH) % TRAIL_LENGTH;
          const srcBase = i * TRAIL_LENGTH * 3 + histIdx * 3;
          const dstBase = i * TRAIL_LENGTH * 3 + j * 3;

          trailPositions[dstBase]     = trailHistory[srcBase];
          trailPositions[dstBase + 1] = trailHistory[srcBase + 1];
          trailPositions[dstBase + 2] = trailHistory[srcBase + 2];

          const ageFactor = 1 - j / TRAIL_LENGTH;

          // Tamanho muito pequeno e quase constante → linha fina
          trailSizes[i * TRAIL_LENGTH + j] = (0.3 + smoothedBass * 0.15) * ageFactor;

          // Opacidade: ponta (j=0) recebe bônus de flash, o resto decai suavemente
          let alpha = (0.25 + smoothedBass * 0.9) * ageFactor;
          if (j === 0) alpha += beatFlash * 0.7; // flash na ponta da cauda
          trailAlphas[i * TRAIL_LENGTH + j] = Math.min(1.5, alpha);
        }
      }
      trailGeometry.attributes.position.needsUpdate = true;
      trailGeometry.attributes.aSize.needsUpdate    = true;
      trailGeometry.attributes.aAlpha.needsUpdate   = true;

      renderer.render(scene, camera);

      // ========== OVERLAY 2D ==========
      const w = overlayCanvas.width;
      const h = overlayCanvas.height;
      const centerX = w / 2;
      const centerY = h / 2;
      const circleBaseRadius = Math.min(w, h) * 0.17;

      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      // --- Spawn de ondas nas batidas ---
      const now = performance.now();
      if (isBeat) {
        const beatStrength = Math.min(0.8, midDiff * 1.5);
        if (now - lastWaveSpawn > 100) {
          waves.push({
            r: circleBaseRadius,
            opacity: 0.8 + beatStrength * 0.3,
            speed: 1.5 + beatStrength * 4,
            bass: beatStrength,
            seed: Math.random() * 100,
          });
          lastWaveSpawn = now;
        }
      }

      // --- Ondas ---
      ctx.globalCompositeOperation = "lighter";
      for (let i = waves.length - 1; i >= 0; i--) {
        const wave = waves[i];
        wave.r       += wave.speed;
        wave.opacity *= 0.94;

        if (wave.opacity < 0.015) { waves.splice(i, 1); continue; }

        const maxR     = circleBaseRadius * 4;
        const progress = (wave.r - circleBaseRadius) / (maxR - circleBaseRadius);
        const alpha    = wave.opacity * (1 - progress * 0.5);

        ctx.beginPath();
        const points = 80;
        for (let j = 0; j <= points; j++) {
          const angle = (j / points) * Math.PI * 2;
          const noise =
            Math.sin(angle * 7 + time * 4 + wave.seed) * (18 * wave.bass) +
            Math.cos(angle * 4 - time * 2 + wave.seed) * (8 * (1 - progress));
          const r = wave.r + noise;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();

        ctx.lineWidth   = (25 + wave.bass * 40) * (1 - progress);
        ctx.strokeStyle = `rgba(100, 150, 255, ${alpha * 0.15})`;
        ctx.shadowBlur  = 40;
        ctx.shadowColor = `rgba(140, 200, 255, ${alpha})`;
        ctx.stroke();

        ctx.lineWidth   = 2 + wave.bass * 6;
        ctx.strokeStyle = `rgba(220, 240, 255, ${alpha * 0.8})`;
        ctx.shadowBlur  = 15;
        ctx.shadowColor = "#ffffff";
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.shadowBlur = 0;

      // --- Anéis decorativos ---
      for (let j = 0; j < 4; j++) {
        ctx.beginPath();
        const points = 120;
        for (let i = 0; i <= points; i++) {
          const a = (i / points) * Math.PI * 2;
          const noise =
            Math.sin(a * 6 + time * 1.5 + j) * 8 +
            Math.cos(a * 4 - time * 1.2 + j) * 6;
          const radius = circleBaseRadius * (0.55 + j * 0.12) + noise + smoothedBass * 18;
          const x = centerX + Math.cos(a) * radius;
          const y = centerY + Math.sin(a) * radius;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255,255,255,${0.15 - j * 0.03})`;
        ctx.lineWidth   = 3 + smoothedBass * 4;
        ctx.shadowBlur  = 30 + smoothedBass * 40;
        ctx.shadowColor = "rgba(180,220,255,0.8)";
        ctx.stroke();
      }

      // --- Esfera central ---
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, circleBaseRadius);
      coreGradient.addColorStop(0,    "rgba(255,255,255,1)");
      coreGradient.addColorStop(0.1,  "rgba(255,255,255,0.95)");
      coreGradient.addColorStop(0.25, "rgba(180,220,255,0.9)");
      coreGradient.addColorStop(0.5,  "rgba(100,140,255,0.3)");
      coreGradient.addColorStop(1,    "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleBaseRadius * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      // --- Barras radiais ---
      ctx.shadowBlur  = 2;
      ctx.shadowColor = "#ffffff83";
      for (let i = 0; i < BAR_COUNT; i++) {
        let targetHeight = 0;
        if (dataArray) {
          const freqIndex = Math.floor((i / BAR_COUNT) * maxFreqIndex);
          targetHeight = ((dataArray[freqIndex] || 0) / 255) * 50;
        }
        smoothedHeights[i] = smoothedHeights[i] * smoothing + targetHeight * (1 - smoothing);
        const barHeight = Math.max(4, smoothedHeights[i]);

        const angle  = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
        const innerR = circleBaseRadius + 10;
        const outerR = innerR + barHeight;
        const x1 = centerX + Math.cos(angle) * innerR;
        const y1 = centerY + Math.sin(angle) * innerR;
        const x2 = centerX + Math.cos(angle) * outerR;
        const y2 = centerY + Math.sin(angle) * outerR;

        ctx.beginPath();
        ctx.lineWidth   = Math.max(2, (w / BAR_COUNT) * 0.8);
        ctx.lineCap     = "butt";
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
      const width  = container.clientWidth;
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
      particleGeometry.dispose();
      particleMaterial.dispose();
      trailGeometry.dispose();
      trailMaterial.dispose();
      renderer.dispose();
      if (overlayCanvas.parentNode) overlayCanvas.parentNode.removeChild(overlayCanvas);
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