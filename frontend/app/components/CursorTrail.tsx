'use client';

import { useEffect, useRef } from 'react';

const CONFIG = {
  ringColor: '16, 163, 127', // RGB for the ChatGPT green (to be visible on light bg)
  maxRadius: 100,
  expandSpeed: 1.5,
  fadeSpeed: 0.015,
  lineWidth: 1.5,
};

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    type Ring = { x: number; y: number; radius: number; opacity: number };
    const rings: Ring[] = [];

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    let lastSpawnTime = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      // Throttle spawn rate to create distinct elegant ripples
      if (now - lastSpawnTime > 40) {
        rings.push({
          x: e.clientX,
          y: e.clientY,
          radius: 5,
          opacity: 0.6,
        });
        lastSpawnTime = now;
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < rings.length; i++) {
        const r = rings[i];
        
        r.radius += CONFIG.expandSpeed;
        r.opacity -= CONFIG.fadeSpeed;

        if (r.opacity <= 0 || r.radius >= CONFIG.maxRadius) {
          rings.splice(i, 1);
          i--;
          continue;
        }

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${CONFIG.ringColor}, ${r.opacity})`;
        ctx.lineWidth = CONFIG.lineWidth;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0, // Keeping it behind the main cards/banners
      }}
    />
  );
}
