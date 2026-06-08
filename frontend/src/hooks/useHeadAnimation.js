import { useRef, useCallback } from 'react';

// ─── Head & Body Animation ──────────────────────────────────────────────────────
// Controls head nodding, tilting, speaking movement, and body posture

function smoothNoise(t, seed = 0) {
  const n = Math.sin((t + seed) * 127.1) * 43758.5453;
  const val = n - Math.floor(n);
  const i = Math.floor(t);
  const f = t - i;
  const s = f * f * (3 - 2 * f);
  const n2 = Math.sin((i + 1 + seed) * 127.1) * 43758.5453;
  const val2 = n2 - Math.floor(n2);
  return val * (1 - s) + val2 * s;
}

export default function useHeadAnimation() {
  const timeRef = useRef(0);
  const seedRef = useRef(Math.random() * 1000);

  // Nod queue
  const nodQueueRef = useRef([]);
  const currentNodRef = useRef(null);

  // Current state
  const modeRef = useRef('idle'); // 'idle' | 'speaking' | 'listening' | 'thinking' | 'nodding'

  // Smooth rotation output
  const rotationRef = useRef({ x: 0, y: 0, z: 0 });
  const targetRotRef = useRef({ x: 0, y: 0, z: 0 });

  const setMode = useCallback((mode) => {
    modeRef.current = mode;
  }, []);

  // Trigger a nod animation
  const triggerNod = useCallback((count = 1, speed = 1) => {
    for (let i = 0; i < count; i++) {
      nodQueueRef.current.push({
        progress: 0,
        duration: 0.5 / speed,
        amplitude: 0.06 + Math.random() * 0.03,
        delay: i * 0.35 / speed,
      });
    }
  }, []);

  // Trigger a head tilt
  const triggerTilt = useCallback((direction = 'right', duration = 2) => {
    const angle = direction === 'right' ? -0.08 : 0.08;
    targetRotRef.current.z = angle;
    setTimeout(() => {
      targetRotRef.current.z = 0;
    }, duration * 1000);
  }, []);

  const update = useCallback((delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    const seed = seedRef.current;
    const mode = modeRef.current;
    const target = { x: 0, y: 0, z: 0 };

    // ── Mode-based movement ──────────────────────────────────────────────────
    if (mode === 'speaking') {
      // Natural speaking movement — small rhythmic nods and turns
      target.x = Math.sin(t * 2.5) * 0.02 + smoothNoise(t * 1.5, seed) * 0.015;
      target.y = smoothNoise(t * 0.8, seed + 100) * 0.03;
      target.z = Math.sin(t * 1.2) * 0.008;
    } else if (mode === 'listening') {
      // Attentive posture — slight forward lean, occasional small nods
      target.x = 0.03 + smoothNoise(t * 0.3, seed) * 0.01;
      target.y = smoothNoise(t * 0.2, seed + 200) * 0.01;
      // Auto-nod occasionally while listening
      if (Math.random() < delta * 0.15) { // ~once every 6-7 seconds
        triggerNod(1, 0.8);
      }
    } else if (mode === 'thinking') {
      // Thoughtful — slight tilt, looking slightly up
      target.x = -0.04 + smoothNoise(t * 0.2, seed) * 0.015;
      target.y = smoothNoise(t * 0.15, seed + 300) * 0.02;
      target.z = -0.05 + smoothNoise(t * 0.1, seed + 400) * 0.02;
    } else {
      // Idle — very subtle movement
      target.x = smoothNoise(t * 0.15, seed) * 0.01;
      target.y = smoothNoise(t * 0.1, seed + 100) * 0.015;
      target.z = smoothNoise(t * 0.08, seed + 200) * 0.008;
    }

    // ── Process nod queue ────────────────────────────────────────────────────
    if (nodQueueRef.current.length > 0 && !currentNodRef.current) {
      const next = nodQueueRef.current[0];
      if (next.delay <= 0) {
        currentNodRef.current = nodQueueRef.current.shift();
      } else {
        next.delay -= delta;
      }
    }

    if (currentNodRef.current) {
      const nod = currentNodRef.current;
      nod.progress += delta;
      const p = nod.progress / nod.duration;

      if (p < 1) {
        // Nod curve: quick down, slower up
        const nodAngle = Math.sin(p * Math.PI) * nod.amplitude;
        target.x += nodAngle;
      } else {
        currentNodRef.current = null;
      }
    }

    // ── Add manual target offset (e.g., from triggerTilt) ────────────────────
    target.z += targetRotRef.current.z;

    // ── Smooth interpolation ─────────────────────────────────────────────────
    const lerpFactor = 0.04;
    rotationRef.current.x += (target.x - rotationRef.current.x) * lerpFactor;
    rotationRef.current.y += (target.y - rotationRef.current.y) * lerpFactor;
    rotationRef.current.z += (target.z - rotationRef.current.z) * lerpFactor;

    return rotationRef.current;
  }, [triggerNod]);

  return {
    update,
    setMode,
    triggerNod,
    triggerTilt,
    rotationRef,
  };
}
