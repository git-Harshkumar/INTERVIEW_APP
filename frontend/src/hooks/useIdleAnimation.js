import { useRef, useCallback } from 'react';

// ─── Simple noise function (no external dependency) ─────────────────────────────
function noise(x) {
  const n = Math.sin(x * 127.1 + x * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(t, seed = 0) {
  const i = Math.floor(t);
  const f = t - i;
  const smooth = f * f * (3 - 2 * f); // smoothstep
  return noise(i + seed) * (1 - smooth) + noise(i + 1 + seed) * smooth;
}

// ─── Blink state machine ────────────────────────────────────────────────────────
function createBlinkState() {
  return {
    nextBlinkTime: 2 + Math.random() * 4,
    isBlinking: false,
    blinkProgress: 0,
    blinkDuration: 0.15,
    doubleBlink: false,
    doubleBlinkGap: 0,
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────────
export default function useIdleAnimation(setIdleAdditive) {
  const timeRef = useRef(0);
  const blinkRef = useRef(createBlinkState());
  const breathRef = useRef({ phase: 0 });
  const microRef = useRef({ seed: Math.random() * 1000 });

  const update = useCallback((delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    const result = {};

    // ── Blinking ──────────────────────────────────────────────────────────────
    const blink = blinkRef.current;
    if (!blink.isBlinking) {
      blink.nextBlinkTime -= delta;
      if (blink.nextBlinkTime <= 0) {
        blink.isBlinking = true;
        blink.blinkProgress = 0;
        blink.blinkDuration = 0.1 + Math.random() * 0.08;
        blink.doubleBlink = Math.random() < 0.2; // 20% chance of double blink
        blink.doubleBlinkGap = 0;
      }
    }

    if (blink.isBlinking) {
      blink.blinkProgress += delta;
      const p = blink.blinkProgress / blink.blinkDuration;

      if (p < 1) {
        // Blink curve: quick close, slower open
        const blinkValue = p < 0.4
          ? p / 0.4 // closing
          : 1 - (p - 0.4) / 0.6; // opening
        result.eyeBlinkLeft = Math.max(0, blinkValue);
        result.eyeBlinkRight = Math.max(0, blinkValue);
      } else if (blink.doubleBlink && blink.doubleBlinkGap < 0.08) {
        blink.doubleBlinkGap += delta;
        result.eyeBlinkLeft = 0;
        result.eyeBlinkRight = 0;
      } else if (blink.doubleBlink && blink.doubleBlinkGap >= 0.08) {
        // Second blink
        const p2 = (blink.blinkProgress - blink.blinkDuration - 0.08) / blink.blinkDuration;
        if (p2 < 1 && p2 >= 0) {
          const blinkValue = p2 < 0.4
            ? p2 / 0.4
            : 1 - (p2 - 0.4) / 0.6;
          result.eyeBlinkLeft = Math.max(0, blinkValue);
          result.eyeBlinkRight = Math.max(0, blinkValue);
        } else {
          blink.isBlinking = false;
          blink.nextBlinkTime = 2.5 + Math.random() * 4;
        }
      } else {
        blink.isBlinking = false;
        blink.nextBlinkTime = 2.5 + Math.random() * 4;
      }
    }

    // ── Breathing ─────────────────────────────────────────────────────────────
    const breathCycle = Math.sin(t * 0.8) * 0.5 + 0.5; // 0-1, ~4s cycle
    // Subtle jaw movement for breathing
    result.jawOpen = (result.jawOpen || 0) + breathCycle * 0.015;
    // Nose movement
    result.noseSneerLeft = breathCycle * 0.02;
    result.noseSneerRight = breathCycle * 0.02;
    breathRef.current.phase = breathCycle;

    // ── Micro-expressions ─────────────────────────────────────────────────────
    const seed = microRef.current.seed;
    // Subtle brow movements
    const browNoise = smoothNoise(t * 0.3, seed) * 2 - 1;
    result.browInnerUp = (result.browInnerUp || 0) + Math.max(0, browNoise * 0.06);
    result.browDownLeft = (result.browDownLeft || 0) + Math.max(0, -browNoise * 0.04);

    // Subtle mouth corner movements
    const mouthNoise = smoothNoise(t * 0.25, seed + 50) * 2 - 1;
    result.mouthSmileLeft = (result.mouthSmileLeft || 0) + Math.max(0, mouthNoise * 0.04);
    result.mouthSmileRight = (result.mouthSmileRight || 0) + Math.max(0, mouthNoise * 0.035);

    // Very subtle cheek movement
    const cheekNoise = smoothNoise(t * 0.2, seed + 100);
    result.cheekSquintLeft = (result.cheekSquintLeft || 0) + cheekNoise * 0.025;
    result.cheekSquintRight = (result.cheekSquintRight || 0) + cheekNoise * 0.02;

    // Eye squint variation (natural)
    const squintNoise = smoothNoise(t * 0.15, seed + 200);
    result.eyeSquintLeft = (result.eyeSquintLeft || 0) + squintNoise * 0.04;
    result.eyeSquintRight = (result.eyeSquintRight || 0) + squintNoise * 0.035;

    if (setIdleAdditive) setIdleAdditive(result);
    return result;
  }, [setIdleAdditive]);

  // Returns head bone rotation offsets for breathing/idle
  const getHeadOffset = useCallback(() => {
    const t = timeRef.current;
    const seed = microRef.current.seed;

    // Very slow head drift
    const headX = smoothNoise(t * 0.12, seed + 300) * 2 - 1; // left-right
    const headY = smoothNoise(t * 0.1, seed + 400) * 2 - 1;  // up-down
    const headZ = smoothNoise(t * 0.08, seed + 500) * 2 - 1; // tilt

    // Breathing head bob
    const breathBob = Math.sin(t * 0.8) * 0.003;

    return {
      x: headY * 0.015 + breathBob, // pitch (nod)
      y: headX * 0.02,              // yaw (turn)
      z: headZ * 0.01,              // roll (tilt)
    };
  }, []);

  return {
    update,
    getHeadOffset,
    blinkRef,
    breathRef,
  };
}
