import { useRef, useCallback } from 'react';

// ─── ARKit Blendshape Names (52 standard) ──────────────────────────────────────
export const ARKIT_BLENDSHAPES = [
  'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
  'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight',
  'eyeBlinkLeft', 'eyeBlinkRight', 'eyeLookDownLeft', 'eyeLookDownRight',
  'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight',
  'eyeLookUpLeft', 'eyeLookUpRight', 'eyeSquintLeft', 'eyeSquintRight',
  'eyeWideLeft', 'eyeWideRight',
  'jawForward', 'jawLeft', 'jawOpen', 'jawRight',
  'mouthClose', 'mouthDimpleLeft', 'mouthDimpleRight',
  'mouthFrownLeft', 'mouthFrownRight', 'mouthFunnel',
  'mouthLeft', 'mouthLowerDownLeft', 'mouthLowerDownRight',
  'mouthPressLeft', 'mouthPressRight', 'mouthPucker',
  'mouthRight', 'mouthRollLower', 'mouthRollUpper',
  'mouthShrugLower', 'mouthShrugUpper', 'mouthSmileLeft', 'mouthSmileRight',
  'mouthStretchLeft', 'mouthStretchRight', 'mouthUpperUpLeft', 'mouthUpperUpRight',
  'noseSneerLeft', 'noseSneerRight', 'tongueOut',
];

// ─── Emotion Presets ────────────────────────────────────────────────────────────
export const EMOTION_PRESETS = {
  neutral: {
    mouthSmileLeft: 0.05,
    mouthSmileRight: 0.05,
    eyeSquintLeft: 0.02,
    eyeSquintRight: 0.02,
  },
  happy: {
    mouthSmileLeft: 0.65,
    mouthSmileRight: 0.65,
    cheekSquintLeft: 0.4,
    cheekSquintRight: 0.4,
    eyeSquintLeft: 0.25,
    eyeSquintRight: 0.25,
    browInnerUp: 0.15,
  },
  impressed: {
    mouthSmileLeft: 0.5,
    mouthSmileRight: 0.5,
    browInnerUp: 0.45,
    browOuterUpLeft: 0.3,
    browOuterUpRight: 0.3,
    jawOpen: 0.08,
    eyeWideLeft: 0.15,
    eyeWideRight: 0.15,
  },
  thinking: {
    browDownLeft: 0.3,
    browInnerUp: 0.2,
    eyeLookUpLeft: 0.3,
    eyeLookUpRight: 0.3,
    mouthPucker: 0.15,
    mouthLeft: 0.1,
  },
  encouraging: {
    mouthSmileLeft: 0.45,
    mouthSmileRight: 0.45,
    browInnerUp: 0.25,
    cheekSquintLeft: 0.2,
    cheekSquintRight: 0.2,
    eyeSquintLeft: 0.15,
    eyeSquintRight: 0.15,
  },
  serious: {
    browDownLeft: 0.2,
    browDownRight: 0.2,
    mouthPressLeft: 0.2,
    mouthPressRight: 0.2,
    jawForward: 0.05,
    mouthSmileLeft: 0.0,
    mouthSmileRight: 0.0,
  },
  concerned: {
    browInnerUp: 0.5,
    browDownLeft: 0.15,
    browDownRight: 0.15,
    mouthFrownLeft: 0.2,
    mouthFrownRight: 0.2,
    eyeSquintLeft: 0.1,
    eyeSquintRight: 0.1,
  },
  surprised: {
    browInnerUp: 0.6,
    browOuterUpLeft: 0.5,
    browOuterUpRight: 0.5,
    eyeWideLeft: 0.5,
    eyeWideRight: 0.5,
    jawOpen: 0.25,
    mouthFunnel: 0.15,
  },
};

// ─── Viseme Shapes (for lip sync) ───────────────────────────────────────────────
export const VISEME_MAP = {
  // silence
  0:  {},
  // PP, BB, MM
  1:  { mouthClose: 0.6, mouthPressLeft: 0.3, mouthPressRight: 0.3 },
  // FF, VV
  2:  { mouthFunnel: 0.2, mouthLowerDownLeft: 0.25, mouthLowerDownRight: 0.25, mouthUpperUpLeft: 0.1, mouthUpperUpRight: 0.1 },
  // TH
  3:  { jawOpen: 0.12, tongueOut: 0.3, mouthLowerDownLeft: 0.1, mouthLowerDownRight: 0.1 },
  // DD, TT, NN
  4:  { jawOpen: 0.15, mouthLowerDownLeft: 0.15, mouthLowerDownRight: 0.15, mouthStretchLeft: 0.1, mouthStretchRight: 0.1 },
  // KK, GG, NG
  5:  { jawOpen: 0.2, mouthShrugUpper: 0.15, mouthStretchLeft: 0.15, mouthStretchRight: 0.15 },
  // CH, JJ, SH, ZH
  6:  { jawOpen: 0.18, mouthFunnel: 0.3, mouthShrugLower: 0.1 },
  // SS, ZZ
  7:  { jawOpen: 0.1, mouthStretchLeft: 0.2, mouthStretchRight: 0.2, mouthSmileLeft: 0.1, mouthSmileRight: 0.1 },
  // RR
  8:  { jawOpen: 0.15, mouthPucker: 0.3, mouthFunnel: 0.15 },
  // LL
  9:  { jawOpen: 0.18, mouthLowerDownLeft: 0.2, mouthLowerDownRight: 0.2, tongueOut: 0.15 },
  // AA (as in "father")
  10: { jawOpen: 0.55, mouthLowerDownLeft: 0.3, mouthLowerDownRight: 0.3, mouthStretchLeft: 0.15, mouthStretchRight: 0.15 },
  // EE (as in "see")
  11: { jawOpen: 0.15, mouthSmileLeft: 0.35, mouthSmileRight: 0.35, mouthStretchLeft: 0.25, mouthStretchRight: 0.25 },
  // IH (as in "sit")
  12: { jawOpen: 0.2, mouthSmileLeft: 0.2, mouthSmileRight: 0.2, mouthStretchLeft: 0.15, mouthStretchRight: 0.15 },
  // OH (as in "go")
  13: { jawOpen: 0.35, mouthFunnel: 0.4, mouthPucker: 0.15 },
  // OO (as in "too")
  14: { jawOpen: 0.15, mouthPucker: 0.55, mouthFunnel: 0.35 },
};

// ─── Hook ───────────────────────────────────────────────────────────────────────
export default function useBlendshapes() {
  // Current blendshape values (what's displayed right now)
  const currentRef = useRef({});
  // Target blendshape values from emotion
  const emotionTargetRef = useRef({});
  // Target blendshape values from lip sync (higher priority)
  const lipTargetRef = useRef({});
  // Additive blendshape values from idle (blink, etc.)
  const idleAdditiveRef = useRef({});
  // Additive from eye tracking
  const eyeAdditiveRef = useRef({});

  const lerpSpeed = useRef(0.08);

  // Set emotion target (blended over time)
  const setEmotion = useCallback((emotionName, intensity = 1.0) => {
    const preset = EMOTION_PRESETS[emotionName] || EMOTION_PRESETS.neutral;
    const target = {};
    for (const [key, value] of Object.entries(preset)) {
      target[key] = value * intensity;
    }
    emotionTargetRef.current = target;
  }, []);

  // Set lip sync viseme (immediate, blended smoothly)
  const setViseme = useCallback((visemeId, weight = 1.0) => {
    const shapes = VISEME_MAP[visemeId] || VISEME_MAP[0];
    const target = {};
    for (const [key, value] of Object.entries(shapes)) {
      target[key] = value * weight;
    }
    lipTargetRef.current = target;
  }, []);

  // Set idle additive (blink, breathe, etc.)
  const setIdleAdditive = useCallback((values) => {
    idleAdditiveRef.current = values;
  }, []);

  // Set eye additive
  const setEyeAdditive = useCallback((values) => {
    eyeAdditiveRef.current = values;
  }, []);

  // Apply blendshapes to mesh each frame
  // Call this in useFrame
  const applyToMesh = useCallback((meshes, delta) => {
    if (!meshes || meshes.length === 0) return;

    const speed = lerpSpeed.current * Math.min(delta * 60, 3);

    // Merge all targets: emotion base + lip override + idle additive + eye additive
    const merged = {};

    // Start with emotion targets
    for (const key of ARKIT_BLENDSHAPES) {
      const emotionVal = emotionTargetRef.current[key] || 0;
      const lipVal = lipTargetRef.current[key];
      const idleVal = idleAdditiveRef.current[key] || 0;
      const eyeVal = eyeAdditiveRef.current[key] || 0;

      // Lip sync overrides mouth-related shapes, adds to others
      const isMouthShape = key.startsWith('mouth') || key.startsWith('jaw') || key === 'tongueOut' || key === 'cheekPuff';
      
      if (isMouthShape && lipVal !== undefined) {
        // Lip sync takes priority for mouth shapes, but blend with emotion
        merged[key] = Math.max(lipVal, emotionVal * 0.3) + idleVal;
      } else {
        merged[key] = emotionVal + idleVal + eyeVal;
      }

      // Clamp to [0, 1]
      merged[key] = Math.max(0, Math.min(1, merged[key]));
    }

    // Lerp current towards merged
    for (const key of ARKIT_BLENDSHAPES) {
      const target = merged[key] || 0;
      const current = currentRef.current[key] || 0;
      currentRef.current[key] = current + (target - current) * speed;
    }

    // Apply to all morphable meshes
    for (const mesh of meshes) {
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) continue;
      for (const key of ARKIT_BLENDSHAPES) {
        const index = mesh.morphTargetDictionary[key];
        if (index !== undefined) {
          mesh.morphTargetInfluences[index] = currentRef.current[key] || 0;
        }
      }
    }
  }, []);

  return {
    setEmotion,
    setViseme,
    setIdleAdditive,
    setEyeAdditive,
    applyToMesh,
    currentRef,
    lerpSpeed,
  };
}
