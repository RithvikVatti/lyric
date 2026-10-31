import React, { useEffect, useRef } from 'react';
import { ColorPalette } from '../types';

interface VisualizerCanvasProps {
  palette: ColorPalette;
  audioEnergy: { bass: number; mid: number; treble: number; overall: number };
  isPlaying: boolean;
}

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  colorKey: 'dominant' | 'secondary' | 'accent' | 'dark';
}

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({
  palette,
  audioEnergy,
  isPlaying
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const orbs: Orb[] = [
      {
        x: width * 0.2,
        y: height * 0.25,
        vx: 0.25,
        vy: 0.2,
        radius: Math.min(width, height) * 0.55,
        baseRadius: Math.min(width, height) * 0.55,
        colorKey: 'dominant'
      },
      {
        x: width * 0.8,
        y: height * 0.7,
        vx: -0.22,
        vy: -0.28,
        radius: Math.min(width, height) * 0.6,
        baseRadius: Math.min(width, height) * 0.6,
        colorKey: 'secondary'
      },
      {
        x: width * 0.5,
        y: height * 0.85,
        vx: 0.18,
        vy: -0.2,
        radius: Math.min(width, height) * 0.5,
        baseRadius: Math.min(width, height) * 0.5,
        colorKey: 'accent'
      },
      {
        x: width * 0.85,
        y: height * 0.15,
        vx: -0.2,
        vy: 0.22,
        radius: Math.min(width, height) * 0.45,
        baseRadius: Math.min(width, height) * 0.45,
        colorKey: 'dominant'
      }
    ];

    let t = 0;

    const render = () => {
      t += 0.008;
      ctx.clearRect(0, 0, width, height);

      // Deep obsidian background
      ctx.fillStyle = '#060609';
      ctx.fillRect(0, 0, width, height);

      const bassBoost = isPlaying ? audioEnergy.bass * 0.4 : 0;

      for (const orb of orbs) {
        orb.x += orb.vx * (isPlaying ? 1.0 : 0.5);
        orb.y += orb.vy * (isPlaying ? 1.0 : 0.5);

        if (orb.x < width * 0.05 || orb.x > width * 0.95) orb.vx *= -1;
        if (orb.y < height * 0.05 || orb.y > height * 0.95) orb.vy *= -1;

        orb.radius = orb.baseRadius * (1 + bassBoost + Math.sin(t + orb.x * 0.005) * 0.06);

        const color = palette[orb.colorKey] || palette.dominant;

        const grad = ctx.createRadialGradient(
          orb.x,
          orb.y,
          0,
          orb.x,
          orb.y,
          orb.radius
        );

        grad.addColorStop(0, color.replace(')', ', 0.38)').replace('rgb', 'rgba'));
        grad.addColorStop(0.5, color.replace(')', ', 0.16)').replace('rgb', 'rgba'));
        grad.addColorStop(1, 'rgba(6, 6, 9, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [palette, audioEnergy, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 select-none filter blur-3xl opacity-80 transition-opacity duration-700"
    />
  );
};
