"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/context/CartContext";

export default function AudioAmbiance() {
  const { isAudioPlaying } = useCart();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const osc1Ref = useRef<OscillatorNode | null>(null);
  const osc2Ref = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    if (isAudioPlaying) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          audioCtxRef.current = new AudioCtx();
        }
        
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        // Master Gain
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
        masterGain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 1.5);
        masterGain.connect(ctx.destination);
        gainNodeRef.current = masterGain;

        // Lowpass filter for deep cinematic warmth
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(220, ctx.currentTime);
        filter.connect(masterGain);

        // Sub bass drone oscillator (55Hz - A1 note)
        const osc1 = ctx.createOscillator();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(55, ctx.currentTime);
        osc1.connect(filter);
        osc1.start();
        osc1Ref.current = osc1;

        // Shimmer oscillator (110Hz - A2 note)
        const osc2 = ctx.createOscillator();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(110.2, ctx.currentTime);
        osc2.connect(filter);
        osc2.start();
        osc2Ref.current = osc2;
      } catch (e) {
        console.warn("Audio Context init suppressed", e);
      }
    } else {
      if (gainNodeRef.current && audioCtxRef.current) {
        try {
          const ctx = audioCtxRef.current;
          if (ctx.state !== "closed") {
            gainNodeRef.current.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
            setTimeout(() => {
              try {
                osc1Ref.current?.stop();
                osc2Ref.current?.stop();
                if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
                  audioCtxRef.current.close().catch(() => {});
                }
              } catch {}
              audioCtxRef.current = null;
            }, 600);
          }
        } catch {}
      }
    }

    return () => {
      try {
        osc1Ref.current?.stop();
        osc2Ref.current?.stop();
        if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
          audioCtxRef.current.close().catch(() => {});
        }
      } catch {}
    };
  }, [isAudioPlaying]);

  return null;
}
