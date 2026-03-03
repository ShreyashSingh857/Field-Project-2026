import { useEffect, useRef, useState } from "react";

const clamp01 = value => Math.min(1, Math.max(0, value));

export default function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const targetRef = useRef(0);
  const smoothRef = useRef(0);
  const frameRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    const readProgress = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const maxScroll = Math.max(1, documentHeight - windowHeight);
      targetRef.current = clamp01(scrollY / maxScroll);
    };

    const animate = () => {
      const delta = targetRef.current - smoothRef.current;
      smoothRef.current += delta * 0.12;

      if (Math.abs(delta) < 0.0005) {
        smoothRef.current = targetRef.current;
      }

      setProgress(prev => {
        if (Math.abs(prev - smoothRef.current) < 0.0005) return prev;
        return smoothRef.current;
      });

      if (Math.abs(targetRef.current - smoothRef.current) > 0.0005) {
        frameRef.current = window.requestAnimationFrame(animate);
      } else {
        tickingRef.current = false;
      }
    };

    const onScroll = () => {
      readProgress();
      if (!tickingRef.current) {
        tickingRef.current = true;
        frameRef.current = window.requestAnimationFrame(animate);
      }
    };

    const onResize = () => {
      readProgress();
      if (!tickingRef.current) {
        tickingRef.current = true;
        frameRef.current = window.requestAnimationFrame(animate);
      }
    };

    readProgress();
    setProgress(targetRef.current);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return progress;
}
