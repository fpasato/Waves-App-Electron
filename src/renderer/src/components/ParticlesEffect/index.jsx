import { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./style.module.css";
import { usePlayer } from "../../store/PlayerContext";

const makeCircleTexture = (size = 64, blur = 0.3) => {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(blur, "rgba(255,255,255,0.9)");
  g.addColorStop(blur + 0.3, "rgba(168,85,247,0.4)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
};

const makeRingTexture = (size = 64) => {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(r, r, r * 0.45, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(200,120,255,0.85)";
  ctx.lineWidth = size * 0.08;
  ctx.stroke();
  return new THREE.CanvasTexture(c);
};

const CIRCLE_TEX = makeCircleTexture();
const RING_TEX = makeRingTexture();

export function ParticlesEffect() {
  const containerRef = useRef(null);
  const { analyserRef } = usePlayer();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    if (!W || !H) return;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, W / H, 0.1, 500);
    camera.position.z = 6;

    const rand = (a, b) => Math.random() * (b - a) + a;
    const lerp = (a, b, t) => a + (b - a) * t;

    // ── 1. ESTRELAS ───────────────────────────────────────────────────────────
    const STAR_COUNT = 3000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      starPos[i * 3] = rand(-30, 30);
      starPos[i * 3 + 1] = rand(-30, 30);
      starPos[i * 3 + 2] = rand(-30, -1); // ← mais perto da câmera
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -15), 50);
    const starMat = new THREE.PointsMaterial({
      size: 0.15,
      color: 0xccaaff,
      transparent: false,
      depthWrite: false,
    });

    const starPoints = new THREE.Points(starGeo, starMat);
    starPoints.frustumCulled = false;
    scene.add(starPoints);

    // ── 2. PARTÍCULAS PRINCIPAIS ──────────────────────────────────────────────
    const MAIN_COUNT = 1800;
    const mainGeo = new THREE.BufferGeometry();
    const mainPos = new Float32Array(MAIN_COUNT * 3);
    const mainBase = new Float32Array(MAIN_COUNT * 3);
    const mainPhase = new Float32Array(MAIN_COUNT);
    const mainRadius = new Float32Array(MAIN_COUNT);

    for (let i = 0; i < MAIN_COUNT; i++) {
      const t = i / MAIN_COUNT;
      const angle = t * Math.PI * 12;
      const r = rand(0.5, 3.5);
      const z = rand(-8, 2); // ← mais perto da câmera
      mainBase[i * 3] = Math.cos(angle) * r;
      mainBase[i * 3 + 1] = Math.sin(angle) * r;
      mainBase[i * 3 + 2] = z;
      mainPos[i * 3] = mainBase[i * 3];
      mainPos[i * 3 + 1] = mainBase[i * 3 + 1];
      mainPos[i * 3 + 2] = mainBase[i * 3 + 2];
      mainPhase[i] = rand(0, Math.PI * 2);
      mainRadius[i] = r;
    }
    mainGeo.setAttribute("position", new THREE.BufferAttribute(mainPos, 3));
    mainGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 20);
    const mainMat = new THREE.PointsMaterial({
      size: 0.3,
      color: 0xa855f7,
      transparent: false,
      depthWrite: false,
    });
    const mainParticles = new THREE.Points(mainGeo, mainMat);
    mainParticles.frustumCulled = false;
    scene.add(mainParticles);

    // ── 3. ANÉIS ──────────────────────────────────────────────────────────────
    const RING_COUNT = 400;
    const ringGeo = new THREE.BufferGeometry();
    const ringPos = new Float32Array(RING_COUNT * 3);
    const ringAngle = new Float32Array(RING_COUNT);
    const ringR = new Float32Array(RING_COUNT);

    for (let i = 0; i < RING_COUNT; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(1.5, 4);
      const z = rand(-3, 3);
      ringAngle[i] = a;
      ringR[i] = r;
      ringPos[i * 3] = Math.cos(a) * r;
      ringPos[i * 3 + 1] = Math.sin(a) * r;
      ringPos[i * 3 + 2] = z;
    }
    ringGeo.setAttribute("position", new THREE.BufferAttribute(ringPos, 3));
    ringGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 10);
    const ringMat = new THREE.PointsMaterial({
      size: 0.4,
      color: 0xd946ef,
      transparent: false,
      depthWrite: false,
    });
    const ringParticles = new THREE.Points(ringGeo, ringMat);
    ringParticles.frustumCulled = false;
    scene.add(ringParticles);

    // ── 4. BURST ──────────────────────────────────────────────────────────────
    const BURST_COUNT = 300;
    const burstGeo = new THREE.BufferGeometry();
    const burstPos = new Float32Array(BURST_COUNT * 3);
    const burstVel = new Float32Array(BURST_COUNT * 3);
    let burstActive = false;
    let burstLife = 0;

    for (let i = 0; i < BURST_COUNT; i++) {
      burstPos[i * 3] = 0;
      burstPos[i * 3 + 1] = 0;
      burstPos[i * 3 + 2] = -200; // ← escondido longe
      const theta = rand(0, Math.PI * 2);
      const phi = Math.acos(rand(-1, 1));
      const sp = rand(0.04, 0.18);
      burstVel[i * 3] = Math.sin(phi) * Math.cos(theta) * sp;
      burstVel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * sp;
      burstVel[i * 3 + 2] = Math.cos(phi) * sp * 0.3;
    }
    burstGeo.setAttribute("position", new THREE.BufferAttribute(burstPos, 3));
    burstGeo.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, -200),
      1,
    );
    const burstMat = new THREE.PointsMaterial({
      depthWrite: false,
      opacity: 0,
      color: 0xffffff,
    });
    const burstParticles = new THREE.Points(burstGeo, burstMat);
    burstParticles.frustumCulled = false;
    scene.add(burstParticles);

    // ── Audio state ───────────────────────────────────────────────────────────
    let dataArray = null;
    let smoothBass = 0;
    let smoothMid = 0;
    let smoothHigh = 0;
    let prevBass = 0;
    let beatCooldown = 0;

    // ── Loop ──────────────────────────────────────────────────────────────────
    let animId;
    let startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = (performance.now() - startTime) / 1000;

      const analyser = analyserRef?.current;
      if (analyser) {
        if (!dataArray) dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        let bass = 0,
          mid = 0,
          high = 0;
        for (let i = 0; i < 10; i++) bass += dataArray[i];
        for (let i = 10; i < 80; i++) mid += dataArray[i];
        for (let i = 80; i < 200; i++) high += dataArray[i];
        bass = bass / 10 / 255;
        mid = mid / 70 / 255;
        high = high / 120 / 255;

        smoothBass = lerp(smoothBass, bass, 0.15);
        smoothMid = lerp(smoothMid, mid, 0.12);
        smoothHigh = lerp(smoothHigh, high, 0.1);

        beatCooldown = Math.max(0, beatCooldown - 1);
        if (
          smoothBass > 0.55 &&
          smoothBass > prevBass * 1.25 &&
          beatCooldown === 0
        ) {
          burstActive = true;
          burstLife = 0;
          beatCooldown = 25;
          const bp = burstGeo.attributes.position.array;
          for (let i = 0; i < BURST_COUNT; i++) {
            bp[i * 3] = rand(-0.2, 0.2);
            bp[i * 3 + 1] = rand(-0.2, 0.2);
            bp[i * 3 + 2] = rand(-0.1, 0.1);
          }
        }
        prevBass = smoothBass;
      } else {
        smoothBass = 0.05 + Math.sin(t * 0.5) * 0.03;
        smoothMid = 0.04 + Math.cos(t * 0.7) * 0.02;
        smoothHigh = 0.03;
      }

      mainParticles.rotation.z = t * 0.04 + smoothBass * 0.3;
      mainParticles.rotation.x = Math.sin(t * 0.1) * 0.15;
      ringParticles.rotation.z = -t * 0.06 + smoothMid * 0.4;
      ringParticles.rotation.y = Math.cos(t * 0.08) * 0.2;

      const mp = mainGeo.attributes.position.array;
      for (let i = 0; i < MAIN_COUNT; i++) {
        const i3 = i * 3;
        const ph = mainPhase[i];
        const bx = mainBase[i3];
        const by = mainBase[i3 + 1];
        const expand = 1 + smoothBass * 1.4;
        mp[i3] = bx * expand + Math.sin(t * 1.2 + ph) * smoothMid * 0.6;
        mp[i3 + 1] = by * expand + Math.cos(t * 1.1 + ph) * smoothMid * 0.6;
        mp[i3 + 2] =
          mainBase[i3 + 2] + Math.sin(t * 0.8 + ph * 2) * smoothHigh * 0.8;
      }
      mainGeo.attributes.position.needsUpdate = true;
      mainMat.size = 0.3 + smoothBass * 0.3 + smoothMid * 0.1; // ← base maior
      mainMat.opacity = 0.8 + smoothBass * 0.2;

      const rp = ringGeo.attributes.position.array;
      for (let i = 0; i < RING_COUNT; i++) {
        const i3 = i * 3;
        const a = ringAngle[i] + t * (0.15 + smoothMid * 0.4);
        const r = ringR[i] * (1 + smoothBass * 0.6);
        rp[i3] = Math.cos(a) * r;
        rp[i3 + 1] = Math.sin(a) * r;
        rp[i3 + 2] =
          ringPos[i * 3 + 2] + Math.sin(t + i * 0.1) * smoothHigh * 0.5;
      }
      ringGeo.attributes.position.needsUpdate = true;
      ringMat.size = 0.4 + smoothBass * 0.4; // ← base maior
      ringMat.opacity = 0.4 + smoothMid * 0.6;

      if (burstActive) {
        burstLife++;
        const progress = burstLife / 45;
        const bp = burstGeo.attributes.position.array;
        for (let i = 0; i < BURST_COUNT; i++) {
          bp[i * 3] += burstVel[i * 3];
          bp[i * 3 + 1] += burstVel[i * 3 + 1];
          bp[i * 3 + 2] += burstVel[i * 3 + 2];
        }
        burstGeo.attributes.position.needsUpdate = true;
        burstMat.opacity = Math.max(0, 0.9 * (1 - progress));
        burstMat.size = 0.2 + progress * 0.15;
        if (burstLife >= 45) burstActive = false;
      } else {
        burstMat.opacity = 0;
      }

      starMat.opacity = 0.5 + smoothHigh * 0.5;
      camera.position.x = Math.sin(t * 0.12) * 0.4;
      camera.position.y = Math.cos(t * 0.09) * 0.25;
      camera.position.z = 6 - smoothBass * 1.2;

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      [starGeo, mainGeo, ringGeo, burstGeo].forEach((g) => g.dispose());
      [starMat, mainMat, ringMat, burstMat].forEach((m) => m.dispose());
      renderer.dispose();
      container.innerHTML = "";
    };
  }, []);

  return <div className={styles.particlesEffectContainer} ref={containerRef} />;
}
