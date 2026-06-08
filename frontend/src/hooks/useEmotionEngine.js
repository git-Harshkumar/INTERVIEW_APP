import { useRef, useCallback } from 'react';

// ─── Emotion State Machine ──────────────────────────────────────────────────────
// Manages transitions between emotional states with smooth blending.
// Each emotion maps to a duration (how long it lasts) and transition speed.

const EMOTION_DEFAULTS = {
  neutral:     { duration: Infinity, transitionSpeed: 0.04 },
  happy:       { duration: 4,        transitionSpeed: 0.06 },
  impressed:   { duration: 5,        transitionSpeed: 0.05 },
  thinking:    { duration: 3,        transitionSpeed: 0.05 },
  encouraging: { duration: 4,        transitionSpeed: 0.06 },
  serious:     { duration: 5,        transitionSpeed: 0.04 },
  concerned:   { duration: 4,        transitionSpeed: 0.05 },
  surprised:   { duration: 2.5,      transitionSpeed: 0.08 },
};

// Behavior triggers associated with emotions
const EMOTION_BEHAVIORS = {
  impressed:   { nod: 2, nodSpeed: 1.2 },
  encouraging: { nod: 1, nodSpeed: 0.8, tilt: 'right' },
  thinking:    { tilt: 'left', eyeMode: 'thinking' },
  surprised:   { eyeMode: 'contact' },
  concerned:   { tilt: 'right' },
  happy:       { nod: 1, nodSpeed: 0.6 },
};

export default function useEmotionEngine({
  setEmotion,
  setHeadMode,
  triggerNod,
  triggerTilt,
  setEyeMode,
} = {}) {
  const currentEmotionRef = useRef('neutral');
  const emotionTimerRef = useRef(Infinity);
  const queueRef = useRef([]);
  const intensityRef = useRef(1.0);

  // Trigger an emotion change
  const triggerEmotion = useCallback((emotionName, options = {}) => {
    const { intensity = 1.0, duration, immediate = false } = options;

    if (!EMOTION_DEFAULTS[emotionName]) {
      console.warn(`Unknown emotion: ${emotionName}`);
      return;
    }

    if (immediate || currentEmotionRef.current === 'neutral') {
      _applyEmotion(emotionName, intensity, duration);
    } else {
      // Queue it for after current emotion finishes
      queueRef.current.push({ emotion: emotionName, intensity, duration });
    }
  }, []);

  function _applyEmotion(emotionName, intensity = 1.0, customDuration) {
    const config = EMOTION_DEFAULTS[emotionName];
    currentEmotionRef.current = emotionName;
    intensityRef.current = intensity;
    emotionTimerRef.current = customDuration || config.duration;

    // Apply blendshape emotion
    if (setEmotion) setEmotion(emotionName, intensity);

    // Apply associated behaviors
    const behavior = EMOTION_BEHAVIORS[emotionName];
    if (behavior) {
      if (behavior.nod && triggerNod) {
        triggerNod(behavior.nod, behavior.nodSpeed || 1);
      }
      if (behavior.tilt && triggerTilt) {
        triggerTilt(behavior.tilt, customDuration || config.duration);
      }
      if (behavior.eyeMode && setEyeMode) {
        setEyeMode(behavior.eyeMode);
      }
    }

    // Set head mode based on emotion
    if (setHeadMode) {
      if (emotionName === 'thinking') setHeadMode('thinking');
      else if (emotionName === 'neutral') setHeadMode('idle');
    }
  }

  // Process an AI response and extract emotion
  const processAIResponse = useCallback((aiData) => {
    const { emotion, behavior } = aiData;

    if (emotion && EMOTION_DEFAULTS[emotion]) {
      triggerEmotion(emotion, { immediate: true });
    }

    // Handle explicit behavior cues from AI
    if (behavior) {
      if (behavior.nod && triggerNod) {
        triggerNod(behavior.nod, behavior.speed || 1);
      }
      if (behavior.tilt && triggerTilt) {
        triggerTilt(behavior.tilt);
      }
    }
  }, [triggerEmotion, triggerNod, triggerTilt]);

  // Call each frame to manage emotion timers
  const update = useCallback((delta) => {
    if (emotionTimerRef.current !== Infinity) {
      emotionTimerRef.current -= delta;

      if (emotionTimerRef.current <= 0) {
        // Current emotion expired — check queue or return to neutral
        if (queueRef.current.length > 0) {
          const next = queueRef.current.shift();
          _applyEmotion(next.emotion, next.intensity, next.duration);
        } else {
          _applyEmotion('neutral', 1.0);
        }
      }
    }

    return currentEmotionRef.current;
  }, []);

  // Set emotion for interview phases
  const setPhaseEmotion = useCallback((phase) => {
    switch (phase) {
      case 'thinking':
      case 'submitting':
        triggerEmotion('thinking', { immediate: true, duration: 30 });
        if (setHeadMode) setHeadMode('thinking');
        break;
      case 'speaking':
        triggerEmotion('neutral', { immediate: true });
        if (setHeadMode) setHeadMode('speaking');
        if (setEyeMode) setEyeMode('contact');
        break;
      case 'recording':
        triggerEmotion('encouraging', { immediate: true, duration: 60 });
        if (setHeadMode) setHeadMode('listening');
        if (setEyeMode) setEyeMode('listening');
        break;
      case 'done':
        triggerEmotion('happy', { immediate: true, duration: Infinity });
        break;
      default:
        triggerEmotion('neutral', { immediate: true });
        if (setHeadMode) setHeadMode('idle');
    }
  }, [triggerEmotion, setHeadMode, setEyeMode]);

  return {
    triggerEmotion,
    processAIResponse,
    update,
    setPhaseEmotion,
    currentEmotionRef,
  };
}
