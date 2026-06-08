import { useRef, useCallback, useEffect } from 'react';

// ─── Audio-amplitude to viseme mapping ──────────────────────────────────────────
// When we don't have per-phoneme timestamps (browser TTS), we use audio
// amplitude and frequency analysis to estimate which viseme to show.

const SMOOTHING = 0.35;

// Frequency band boundaries (approximate formant ranges)
const LOW_BAND = { min: 100, max: 500 };    // vowels like AA, OH
const MID_BAND = { min: 500, max: 2000 };   // consonants, EE, IH
const HIGH_BAND = { min: 2000, max: 6000 }; // sibilants SS, SH

export default function useLipSync(setViseme) {
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const freqArrayRef = useRef(null);
  const smoothedVolumeRef = useRef(0);
  const lastVisemeRef = useRef(0);
  const isActiveRef = useRef(false);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);

  // Connect an audio source (HTMLAudioElement or MediaStream) to the analyser
  const connectAudio = useCallback((audioSource) => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;

      // Reuse or create audio context
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AC();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      // Create analyser
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.fftSize);
      freqArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      // Connect source
      let source;
      if (audioSource instanceof HTMLAudioElement || audioSource instanceof HTMLVideoElement) {
        source = ctx.createMediaElementSource(audioSource);
        source.connect(analyser);
        analyser.connect(ctx.destination); // so audio still plays
      } else if (audioSource instanceof MediaStream) {
        source = ctx.createMediaStreamSource(audioSource);
        source.connect(analyser);
      } else if (audioSource instanceof AudioNode) {
        audioSource.connect(analyser);
        analyser.connect(ctx.destination);
        source = audioSource;
      }

      sourceNodeRef.current = source;
      isActiveRef.current = true;
    } catch (err) {
      console.warn('LipSync: Failed to connect audio', err);
    }
  }, []);

  // Disconnect audio
  const disconnectAudio = useCallback(() => {
    isActiveRef.current = false;
    try {
      sourceNodeRef.current?.disconnect();
    } catch { /* already disconnected */ }
    sourceNodeRef.current = null;
    analyserRef.current = null;
    smoothedVolumeRef.current = 0;
    lastVisemeRef.current = 0;
    if (setViseme) setViseme(0, 0);
  }, [setViseme]);

  // Call this each frame (from useFrame) to update lip sync
  const update = useCallback(() => {
    if (!isActiveRef.current || !analyserRef.current || !dataArrayRef.current) {
      // No audio active — mouth should be closed
      if (lastVisemeRef.current !== 0) {
        lastVisemeRef.current = 0;
        if (setViseme) setViseme(0, 0);
      }
      return;
    }

    const analyser = analyserRef.current;

    // Get time-domain data for volume
    analyser.getByteTimeDomainData(dataArrayRef.current);
    const timeData = dataArrayRef.current;
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / timeData.length);
    const volume = Math.min(rms * 4, 1); // normalize to 0-1

    // Smooth volume
    smoothedVolumeRef.current += (volume - smoothedVolumeRef.current) * SMOOTHING;
    const smoothVol = smoothedVolumeRef.current;

    // If volume is very low, close mouth
    if (smoothVol < 0.02) {
      lastVisemeRef.current = 0;
      if (setViseme) setViseme(0, 0);
      return;
    }

    // Get frequency data
    analyser.getByteFrequencyData(freqArrayRef.current);
    const freqData = freqArrayRef.current;
    const binCount = analyser.frequencyBinCount;
    const sampleRate = audioContextRef.current?.sampleRate || 44100;
    const binHz = sampleRate / analyser.fftSize;

    // Calculate energy in frequency bands
    let lowEnergy = 0, midEnergy = 0, highEnergy = 0;
    let lowCount = 0, midCount = 0, highCount = 0;

    for (let i = 0; i < binCount; i++) {
      const freq = i * binHz;
      const value = freqData[i] / 255;
      if (freq >= LOW_BAND.min && freq <= LOW_BAND.max) {
        lowEnergy += value;
        lowCount++;
      } else if (freq >= MID_BAND.min && freq <= MID_BAND.max) {
        midEnergy += value;
        midCount++;
      } else if (freq >= HIGH_BAND.min && freq <= HIGH_BAND.max) {
        highEnergy += value;
        highCount++;
      }
    }

    lowEnergy = lowCount > 0 ? lowEnergy / lowCount : 0;
    midEnergy = midCount > 0 ? midEnergy / midCount : 0;
    highEnergy = highCount > 0 ? highEnergy / highCount : 0;

    // Map frequency profile to viseme
    let viseme = 0;
    let weight = smoothVol;

    if (highEnergy > midEnergy && highEnergy > lowEnergy) {
      // Sibilant sounds (SS, SH, CH)
      viseme = highEnergy > 0.4 ? 6 : 7;
      weight = Math.min(smoothVol * 1.2, 1);
    } else if (lowEnergy > midEnergy * 1.3) {
      // Open vowels (AA, OH, OO)
      if (smoothVol > 0.5) {
        viseme = 10; // AA — wide open
      } else if (smoothVol > 0.3) {
        viseme = 13; // OH
      } else {
        viseme = 14; // OO
      }
      weight = smoothVol * 1.1;
    } else if (midEnergy > lowEnergy) {
      // Mid-range (EE, IH, consonants)
      if (midEnergy > 0.5) {
        viseme = 11; // EE
      } else if (midEnergy > 0.3) {
        viseme = 12; // IH
      } else {
        viseme = 4;  // DD, TT
      }
      weight = smoothVol;
    } else {
      // Nasal, labial
      if (smoothVol > 0.15) {
        viseme = smoothVol > 0.4 ? 5 : 1; // KK/GG or PP/BB
      }
      weight = smoothVol * 0.9;
    }

    // Add some variation based on time
    const time = Date.now() * 0.001;
    const jitter = Math.sin(time * 8) * 0.05;
    weight = Math.max(0, Math.min(1, weight + jitter));

    lastVisemeRef.current = viseme;
    if (setViseme) setViseme(viseme, weight);
  }, [setViseme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [disconnectAudio]);

  return {
    connectAudio,
    disconnectAudio,
    update,
    isActiveRef,
    analyserRef,
  };
}
