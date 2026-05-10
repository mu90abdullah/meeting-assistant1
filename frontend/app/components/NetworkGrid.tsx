'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  pulsePhase: number;
  pulseSpeed: number;
}

const PARTICLE_COUNT = 80;
const CONNECTION_DISTANCE = 140;
const MOUSE_RADIUS = 180;
const MOUSE_REPEL_STRENGTH = 0.5;

export default function NetworkGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* ── Resize handler ── */
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    /* ── Mouse tracking ── */
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);

    /* ── Init particles ── */
    const initParticles = () => {
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.8 + 0.6,
        opacity: Math.random() * 0.5 + 0.3,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.015 + 0.008,
      }));
    };
    initParticles();

    /* ── Accent color palette (blue tones matching the design system) ── */
    const NODE_COLOR   = 'rgba(50, 121, 249,';   // electric blue
    const LINE_COLOR   = 'rgba(50, 121, 249,';
    const GLOW_COLOR   = 'rgba(100, 160, 255,';
    const MOUSE_COLOR  = 'rgba(130, 190, 255,';

    /* ── Animation loop ── */
    let time = 0;
    const draw = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      time += 1;

      /* Update positions */
      particles.forEach((p) => {
        /* Mouse repulsion */
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
          p.vx += (dx / dist) * force * MOUSE_REPEL_STRENGTH;
          p.vy += (dy / dist) * force * MOUSE_REPEL_STRENGTH;
        }

        /* Velocity damping */
        p.vx *= 0.98;
        p.vy *= 0.98;

        /* Max speed cap */
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 1.5) {
          p.vx = (p.vx / speed) * 1.5;
          p.vy = (p.vy / speed) * 1.5;
        }

        p.x += p.vx;
        p.y += p.vy;

        /* Wrap edges */
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y = -20;

        /* Pulse opacity */
        p.pulsePhase += p.pulseSpeed;
        const pulse = Math.sin(p.pulsePhase) * 0.15;
        const currentOpacity = Math.max(0.1, Math.min(0.85, p.opacity + pulse));

        /* Draw connections */
        particles.forEach((other) => {
          if (other === p) return;
          const cx = p.x - other.x;
          const cy = p.y - other.y;
          const d = Math.sqrt(cx * cx + cy * cy);
          if (d < CONNECTION_DISTANCE) {
            const alpha = (1 - d / CONNECTION_DISTANCE) * 0.35;

            /* Check if near mouse — highlight those lines */
            const midX = (p.x + other.x) / 2;
            const midY = (p.y + other.y) / 2;
            const mDist = Math.sqrt((midX - mouse.x) ** 2 + (midY - mouse.y) ** 2);
            const boost = mDist < MOUSE_RADIUS ? (1 - mDist / MOUSE_RADIUS) * 0.5 : 0;

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(other.x, other.y);

            /* Gradient line */
            const grad = ctx.createLinearGradient(p.x, p.y, other.x, other.y);
            grad.addColorStop(0, `${LINE_COLOR}${(alpha + boost).toFixed(3)})`);
            grad.addColorStop(0.5, `${MOUSE_COLOR}${(alpha * 0.5 + boost * 0.8).toFixed(3)})`);
            grad.addColorStop(1, `${LINE_COLOR}${(alpha + boost).toFixed(3)})`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = boost > 0.1 ? 1.2 : 0.7;
            ctx.stroke();
          }
        });

        /* Draw node */
        const r = p.radius + Math.sin(p.pulsePhase) * 0.4;

        /* Outer glow */
        const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
        glowGrad.addColorStop(0, `${GLOW_COLOR}${(currentOpacity * 0.35).toFixed(3)})`);
        glowGrad.addColorStop(1, `${GLOW_COLOR}0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 5, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        /* Core dot */
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `${NODE_COLOR}${currentOpacity.toFixed(3)})`;
        ctx.fill();
      });

      /* ── Mouse cursor ripple ── */
      if (mouse.x > 0) {
        const ripplePhase = (time % 120) / 120;
        for (let i = 0; i < 3; i++) {
          const rippleR = (MOUSE_RADIUS * 0.4 * (ripplePhase + i / 3)) % MOUSE_RADIUS;
          const rippleAlpha = (1 - rippleR / MOUSE_RADIUS) * 0.15;
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, rippleR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(100, 180, 255, ${rippleAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.55,
      }}
    />
  );
}
