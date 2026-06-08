import { useRef, useCallback } from 'react';

// ─── Eye Tracking & Natural Gaze ────────────────────────────────────────────────
// Simulates natural eye contact behavior:
// - Default: look at camera (candidate)
// - Periodic look-away with natural return
// - Thinking: eyes drift upward
// - Saccades: tiny random eye movements

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

export default function useEyeTracking(setEyeAdditive) {
  const timeRef = useRef(0);
  const stateRef = useRef({
    mode: 'contact',       // 'contact' | 'lookaway' | 'thinking' | 'saccade'
    lookawayTimer: 5 + Math.random() * 5,
    lookawayDuration: 0,
    lookawayTarget: { x: 0, y: 0 },
    saccadeTimer: 0.5 + Math.random() * 1.5,
    currentGaze: { x: 0, y: 0 },
    targetGaze: { x: 0, y: 0 },
    seed: Math.random() * 1000,
  });

  const setMode = useCallback((mode) => {
    const state = stateRef.current;
    if (mode === 'thinking') {
      state.mode = 'thinking';
      state.targetGaze = { x: 0.15, y: 0.25 }; // look slightly up and to the side
    } else if (mode === 'contact') {
      state.mode = 'contact';
      state.targetGaze = { x: 0, y: 0 };
    } else if (mode === 'listening') {
      state.mode = 'contact';
      state.targetGaze = { x: 0, y: 0 };
      state.lookawayTimer = 8 + Math.random() * 5; // look away less when listening
    }
  }, []);

  const update = useCallback((delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    const state = stateRef.current;
    const result = {};

    // ── Saccade micro-movements ───────────────────────────────────────────────
    state.saccadeTimer -= delta;
    if (state.saccadeTimer <= 0) {
      state.saccadeTimer = 0.3 + Math.random() * 2;
      // Tiny random eye movement
      if (state.mode === 'contact') {
        state.targetGaze = {
          x: (Math.random() - 0.5) * 0.06,
          y: (Math.random() - 0.5) * 0.04,
        };
      }
    }

    // ── Look-away behavior ────────────────────────────────────────────────────
    if (state.mode === 'contact' || state.mode === 'lookaway') {
      if (state.mode === 'contact') {
        state.lookawayTimer -= delta;
        if (state.lookawayTimer <= 0) {
          state.mode = 'lookaway';
          state.lookawayDuration = 0.5 + Math.random() * 1.5;
          // Pick a natural look-away direction (usually to the side or slightly down)
          const angle = Math.random() * Math.PI * 2;
          const dist = 0.15 + Math.random() * 0.2;
          state.lookawayTarget = {
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist * 0.5,
          };
          state.targetGaze = state.lookawayTarget;
        }
      }

      if (state.mode === 'lookaway') {
        state.lookawayDuration -= delta;
        if (state.lookawayDuration <= 0) {
          state.mode = 'contact';
          state.targetGaze = { x: 0, y: 0 };
          state.lookawayTimer = 4 + Math.random() * 8;
        }
      }
    }

    // ── Thinking gaze ─────────────────────────────────────────────────────────
    if (state.mode === 'thinking') {
      // Slow drift while thinking
      const thinkNoise = smoothNoise(t * 0.3, state.seed);
      state.targetGaze = {
        x: 0.1 + thinkNoise * 0.1,
        y: 0.2 + Math.sin(t * 0.5) * 0.05,
      };
    }

    // ── Smooth interpolation ──────────────────────────────────────────────────
    const lerpFactor = 0.06;
    state.currentGaze.x += (state.targetGaze.x - state.currentGaze.x) * lerpFactor;
    state.currentGaze.y += (state.targetGaze.y - state.currentGaze.y) * lerpFactor;

    const gx = state.currentGaze.x;
    const gy = state.currentGaze.y;

    // Map gaze to ARKit blendshapes
    // Horizontal: negative = look left, positive = look right
    if (gx > 0.01) {
      result.eyeLookOutLeft = gx;
      result.eyeLookInRight = gx;
    } else if (gx < -0.01) {
      result.eyeLookInLeft = -gx;
      result.eyeLookOutRight = -gx;
    }

    // Vertical: positive = look up, negative = look down
    if (gy > 0.01) {
      result.eyeLookUpLeft = gy;
      result.eyeLookUpRight = gy;
    } else if (gy < -0.01) {
      result.eyeLookDownLeft = -gy;
      result.eyeLookDownRight = -gy;
    }

    if (setEyeAdditive) setEyeAdditive(result);
    return { gaze: state.currentGaze };
  }, [setEyeAdditive]);

  return {
    update,
    setMode,
    stateRef,
  };
}
