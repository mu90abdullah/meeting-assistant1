'use client';

/**
 * MeshBackground — Antigravity Interactive Orb Background
 * ─────────────────────────────────────────────────────────
 * Renders 5 blurred radial-gradient orbs that follow the mouse cursor
 * with a smooth parallax lag via GSAP quickTo().
 * Also applies idle Lissajous drift so the bg is never static.
 *
 * Usage: drop inside any layout wrapper, it is position:fixed so
 * it always fills the viewport regardless of scroll position.
 */

import { useEffect, useRef } from 'react';

/* ── Per-orb configuration ──────────────────────────────── */
interface OrbConfig {
  id: string;
  factorX: number;   // px moved per unit of normalised mouse [-0.5…0.5]
  factorY: number;   // negative → moves opposite to cursor (depth)
  driftAmpX: number; // idle drift amplitude X (px)
  driftAmpY: number; // idle drift amplitude Y (px)
  driftSpeedX: number; // idle drift period X (seconds)
  driftSpeedY: number; // idle drift period Y (seconds)
  duration: number;  // GSAP ease duration (lag feel)
  ease: string;
}

const ORB_CONFIGS: OrbConfig[] = [
  { id: 'orb1', factorX:  220, factorY:  160, driftAmpX: 60, driftAmpY: 45, driftSpeedX: 18, driftSpeedY: 22, duration: 1.8, ease: 'power2.out' },
  { id: 'orb2', factorX: -180, factorY: -130, driftAmpX: 50, driftAmpY: 70, driftSpeedX: 25, driftSpeedY: 20, duration: 2.2, ease: 'power2.out' },
  { id: 'orb3', factorX:  140, factorY: -100, driftAmpX: 80, driftAmpY: 40, driftSpeedX: 20, driftSpeedY: 28, duration: 1.5, ease: 'power3.out' },
  { id: 'orb4', factorX: -120, factorY:  90,  driftAmpX: 40, driftAmpY: 60, driftSpeedX: 30, driftSpeedY: 17, duration: 2.6, ease: 'power2.out' },
  { id: 'orb5', factorX:  90,  factorY:  120, driftAmpX: 70, driftAmpY: 50, driftSpeedX: 22, driftSpeedY: 32, duration: 1.2, ease: 'power3.out' },
];

export default function MeshBackground() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /* ── Dynamically load GSAP from CDN to avoid bundle bloat ── */
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
    script.async = true;

    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gsap = (window as any).gsap;
      if (!gsap || !sceneRef.current) return;

      /* mouse state: normalised to [-0.5, 0.5] */
      let mx = 0;
      let my = 0;

      const onMouseMove = (e: MouseEvent) => {
        mx = e.clientX / window.innerWidth  - 0.5;
        my = e.clientY / window.innerHeight - 0.5;
      };
      document.addEventListener('mousemove', onMouseMove);

      /* reset on resize */
      const onResize = () => { mx = 0; my = 0; };
      window.addEventListener('resize', onResize);

      /* ── Build quickTo setters for each orb ── */
      type OrbInstance = {
        cfg: OrbConfig;
        moveX: (v: number) => void;
        moveY: (v: number) => void;
        driftX: number;
        driftY: number;
      };

      const orbs: OrbInstance[] = ORB_CONFIGS.map((cfg) => {
        const el = document.getElementById(cfg.id);
        if (!el) return null;

        /* staggered fade-in */
        gsap.to(el, { opacity: 0.82, duration: 2.5, delay: Math.random() * 0.8, ease: 'power2.inOut' });

        /* breathing pulse */
        gsap.to(el, {
          scale: 1.08,
          duration: 4 + ORB_CONFIGS.indexOf(cfg) * 1.2,
          repeat: -1, yoyo: true,
          ease: 'sine.inOut',
          delay: ORB_CONFIGS.indexOf(cfg) * 0.7,
        });

        return {
          cfg,
          moveX: gsap.quickTo(el, 'x', { duration: cfg.duration, ease: cfg.ease }),
          moveY: gsap.quickTo(el, 'y', { duration: cfg.duration, ease: cfg.ease }),
          driftX: 0,
          driftY: 0,
        };
      }).filter(Boolean) as OrbInstance[];

      /* ── Ticker: runs every frame ── */
      const startTime = Date.now();
      const tick = () => {
        const t = (Date.now() - startTime) / 1000;
        orbs.forEach((o) => {
          o.driftX = Math.sin((t / o.cfg.driftSpeedX) * Math.PI * 2) * o.cfg.driftAmpX;
          o.driftY = Math.cos((t / o.cfg.driftSpeedY) * Math.PI * 2) * o.cfg.driftAmpY;
          o.moveX(mx * o.cfg.factorX + o.driftX);
          o.moveY(my * o.cfg.factorY + o.driftY);
        });
      };
      gsap.ticker.add(tick);

      /* ── Cleanup on unmount ── */
      return () => {
        gsap.ticker.remove(tick);
        document.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', onResize);
      };
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  return (
    <>
      {/* ── Fixed scene: sits behind all page content ── */}
      <div
        ref={sceneRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          /* Light base so orbs show as soft pastels */
          background: 'linear-gradient(145deg, #f8f9ff 0%, #f0f4ff 50%, #f5f8ff 100%)',
        }}
      >
        {/* Orb 1 — soft lavender — top-left */}
        <div id="orb1" style={{
          position: 'absolute',
          width: '800px', height: '800px',
          borderRadius: '50%',
          top: '-20%', left: '-15%',
          background: 'radial-gradient(circle at 40% 40%, #a78bfa, #ede9fe 70%)',
          filter: 'blur(100px)',
          opacity: 0,
          willChange: 'transform',
          mixBlendMode: 'multiply',
        }} />

        {/* Orb 2 — sky blue — right side */}
        <div id="orb2" style={{
          position: 'absolute',
          width: '650px', height: '650px',
          borderRadius: '50%',
          top: '15%', right: '-10%',
          background: 'radial-gradient(circle at 60% 35%, #60a5fa, #dbeafe 70%)',
          filter: 'blur(100px)',
          opacity: 0,
          willChange: 'transform',
          mixBlendMode: 'multiply',
        }} />

        {/* Orb 3 — soft rose/pink — bottom center */}
        <div id="orb3" style={{
          position: 'absolute',
          width: '550px', height: '550px',
          borderRadius: '50%',
          bottom: '-8%', left: '28%',
          background: 'radial-gradient(circle at 50% 60%, #f9a8d4, #fce7f3 70%)',
          filter: 'blur(100px)',
          opacity: 0,
          willChange: 'transform',
          mixBlendMode: 'multiply',
        }} />

        {/* Orb 4 — mint green — mid left */}
        <div id="orb4" style={{
          position: 'absolute',
          width: '500px', height: '500px',
          borderRadius: '50%',
          top: '40%', left: '5%',
          background: 'radial-gradient(circle at 45% 45%, #6ee7b7, #d1fae5 70%)',
          filter: 'blur(100px)',
          opacity: 0,
          willChange: 'transform',
          mixBlendMode: 'multiply',
        }} />

        {/* Orb 5 — warm peach — bottom right */}
        <div id="orb5" style={{
          position: 'absolute',
          width: '420px', height: '420px',
          borderRadius: '50%',
          bottom: '8%', right: '10%',
          background: 'radial-gradient(circle at 55% 55%, #fbbf24, #fef3c7 70%)',
          filter: 'blur(100px)',
          opacity: 0,
          willChange: 'transform',
          mixBlendMode: 'multiply',
        }} />

        {/* Subtle dot-grid pattern — like Linear/Notion */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }} />
      </div>
    </>
  );
}
