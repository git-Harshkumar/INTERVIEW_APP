import { useRef, useCallback, useEffect, useState } from 'react';
import api from '../api';

// ─── Voice Synthesis Hook ───────────────────────────────────────────────────────
// Primary: ElevenLabs API (via backend proxy)
// Fallback: Browser SpeechSynthesis
// Returns an audio element and provides callbacks for lip sync connection

export default function useVoice({ onSpeakStart, onSpeakEnd, onAudioReady } = {}) {
  const audioRef = useRef(null);
  const synthRef = useRef(null);
  const speakTokenRef = useRef(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [useElevenLabs, setUseElevenLabs] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    // Create a persistent audio element for ElevenLabs playback
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      audio.pause();
      audio.src = '';
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ── ElevenLabs TTS ────────────────────────────────────────────────────────────
  const _speakElevenLabs = useCallback(async (text, token) => {
    try {
      const response = await api.post('/interview/tts', { text }, {
        responseType: 'blob',
        timeout: 30000,
      });

      if (token !== speakTokenRef.current || !mountedRef.current) return;

      const blob = response.data;
      const url = URL.createObjectURL(blob);
      const audio = audioRef.current;
      
      audio.src = url;
      
      // Notify caller so they can connect audio analyzer for lip sync
      if (onAudioReady) onAudioReady(audio);

      return new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (mountedRef.current) {
            setIsSpeaking(false);
            if (onSpeakEnd) onSpeakEnd();
          }
          resolve();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(url);
          if (mountedRef.current) {
            setIsSpeaking(false);
            if (onSpeakEnd) onSpeakEnd();
          }
          resolve();
        };

        audio.play().catch(() => {
          // Autoplay blocked — try to recover
          resolve();
        });

        if (mountedRef.current) {
          setIsSpeaking(true);
          if (onSpeakStart) onSpeakStart();
        }
      });
    } catch (err) {
      console.warn('ElevenLabs TTS failed, falling back to browser TTS:', err.message);
      setUseElevenLabs(false);
      return _speakBrowser(text, token);
    }
  }, [onSpeakStart, onSpeakEnd, onAudioReady]);

  // ── Browser TTS Fallback ──────────────────────────────────────────────────────
  const _speakBrowser = useCallback((text, token) => {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth || !text) {
        resolve();
        return;
      }

      synth.cancel();

      const parts = text
        .replace(/\s+/g, ' ')
        .match(/[^.!?]+(?:[.!?]+|$)/g)
        ?.map(p => p.trim())
        .filter(Boolean) || [text.trim()];

      let i = 0;

      if (mountedRef.current) {
        setIsSpeaking(true);
        if (onSpeakStart) onSpeakStart();
      }

      const next = () => {
        if (token !== speakTokenRef.current || i >= parts.length || !mountedRef.current) {
          if (mountedRef.current) {
            setIsSpeaking(false);
            if (onSpeakEnd) onSpeakEnd();
          }
          resolve();
          return;
        }
        const u = new SpeechSynthesisUtterance(parts[i++].trim());
        u.rate = 1.15;
        u.pitch = 1;
        const voices = synth.getVoices();
        const v = voices.find(v => v.name.includes('Google') && v.lang === 'en-US')
                || voices.find(v => v.lang.startsWith('en'));
        if (v) u.voice = v;
        u.onend = () => token === speakTokenRef.current && next();
        u.onerror = () => token === speakTokenRef.current && next();
        synth.speak(u);
      };

      if (synth.getVoices().length === 0) {
        synth.addEventListener('voiceschanged', next, { once: true });
      } else {
        next();
      }
    });
  }, [onSpeakStart, onSpeakEnd]);

  // ── Public speak function ─────────────────────────────────────────────────────
  const speak = useCallback(async (text) => {
    const token = ++speakTokenRef.current;
    
    if (useElevenLabs) {
      return _speakElevenLabs(text, token);
    } else {
      return _speakBrowser(text, token);
    }
  }, [useElevenLabs, _speakElevenLabs, _speakBrowser]);

  // ── Cancel speaking ───────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    speakTokenRef.current++;
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsSpeaking(false);
    if (onSpeakEnd) onSpeakEnd();
  }, [onSpeakEnd]);

  return {
    speak,
    cancel,
    isSpeaking,
    audioRef,
    speakTokenRef,
    useElevenLabs,
    setUseElevenLabs,
  };
}
