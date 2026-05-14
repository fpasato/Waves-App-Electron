import { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./style.module.css";
import { usePlayer } from "../../store/PlayerContext";

// Textura de brilho (glow) idêntica à do WaveArea
const createGlowTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);

  // núcleo ultra brilhante
  gradient.addColorStop(0, "rgba(255,255,255,1)");

  // glow branco intenso
  gradient.addColorStop(0.15, "rgba(255,255,255,0.95)");

  // halo azul frio
  gradient.addColorStop(0.35, "rgba(220,235,255,0.85)");

  // borda etérea
  gradient.addColorStop(0.6, "rgba(140,180,255,0.25)");

  // fade transparente
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);

  return texture;
};
const GLOW_TEXTURE = createGlowTexture();

export function ParticlesEffect() {
  const containerRef = useRef(null);
  const { analyserRef } = usePlayer();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !analyserRef?.current) return;

    // --- SETUP ---
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
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // --- PARTICLES ---
    const COUNT = 2000;
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

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.25,
      map: GLOW_TEXTURE,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 1,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // --- AUDIO LOGIC ---
    const analyser = analyserRef.current;
    analyser.smoothingTimeConstant = 0.8;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let smoothedBass = 0;
    let animationId;

    // --- LOOP ---
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      analyser.getByteFrequencyData(dataArray);

      // Cálculo do grave (médias das primeiras 40 bandas)
      let bass = 0;
      for (let i = 0; i < 40; i++) bass += dataArray[i];
      bass = bass / 40 / 255;
      smoothedBass = smoothedBass * 0.78 + bass * 0.17;

      const force = smoothedBass * 6;
      const time = performance.now() * 0.001;
      const pos = geometry.attributes.position.array;

      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;

        // Movimento em Z (fluxo contínuo)
        pos[i3 + 2] += 0.008 + force * 0.06;
        if (pos[i3 + 2] > 5) pos[i3 + 2] = -100;

        // Oscilação em X e Y baseada no grave
        pos[i3] = basePositions[i3] + Math.sin(time + i * 0.13) * force;
        pos[i3 + 1] = basePositions[i3 + 1] + Math.cos(time + i * 0.13) * force;
      }

      geometry.attributes.position.needsUpdate = true;

      // Reações visuais ao grave
      material.size = 0.15 + smoothedBass * 0.3;
      material.opacity = 0.5 + smoothedBass * 1.5;
      camera.position.z = 5 - smoothedBass * 0.7;

      renderer.render(scene, camera);
    };

    animate();

    // --- RESIZE HANDLER ---
    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    // --- CLEANUP ---
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [analyserRef]); // dependência necessária para garantir acesso ao ref atualizado

  return <div className={styles.particlesEffectContainer} ref={containerRef} />;
}
