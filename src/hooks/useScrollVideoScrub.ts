"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface UseScrollVideoScrubOptions {
  triggerRef: React.RefObject<HTMLElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  start?: string;
  end?: string;
  pin?: boolean;
}

/**
 * Syncs HTML5 video playback to scroll progress using GSAP ScrollTrigger.
 * For optimal performance, encode video with short GOP (keyframe every 1-2 frames).
 */
export function useScrollVideoScrub({
  triggerRef,
  videoRef,
  start = "top top",
  end = "+=2500",
  pin = true,
}: UseScrollVideoScrubOptions) {
  const triggerInstanceRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !triggerRef.current || !videoRef.current) return;

    const video = videoRef.current;
    const trigger = triggerRef.current;

    const onLoadedMetadata = () => {
      const ctx = gsap.context(() => {
        triggerInstanceRef.current = ScrollTrigger.create({
          trigger,
          start,
          end,
          pin,
          scrub: 0.5,
          onUpdate: (self) => {
            if (video && video.duration && !isNaN(video.duration)) {
              // Direct scrub mapping
              video.currentTime = self.progress * video.duration;
            }
          },
        });
      }, trigger);

      return () => ctx.revert();
    };

    if (video.readyState >= 1) {
      onLoadedMetadata();
    } else {
      video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    }

    return () => {
      if (triggerInstanceRef.current) {
        triggerInstanceRef.current.kill();
      }
    };
  }, [triggerRef, videoRef, start, end, pin]);
}

