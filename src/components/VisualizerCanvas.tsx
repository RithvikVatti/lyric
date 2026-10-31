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

    // Create 4 floating ambient orbs
    const orbs: Orb[] = [
      {
        x: width * 0.25,
        y: height * 0.3,
        vx: 0.35,
        vy: 0.25,
        radius: Math.min(width, height) * 0.45,
        baseRadius: Math.min(width, height) * 0.45,
        colorKey: 'dominant'
      },
      {
        x: width * 0.75,
        y: height * 0.65,
        vx: -0.3,
        vy: -0.4,
        radius: Math.min(width, height) * 0.5,
        baseRadius: Math.min(width, height) * 0.5,
        colorKey: 'secondary'
      },
      {
        x: width * 0.5,
        y: height * 0.8,
        vx: 0.2,
        vy: -0.3,
        radius: Math.min(width, height) * 0.4,
        baseRadius: Math.min(width, height) * 0.4,
        colorKey: 'accent'
      },
      {
        x: width * 0.8,
        y: height * 0.2,
        vx: -0.25,
        vy: 0.3,
        radius: Math.min(width, height) * 0.38,
        baseRadius: Math.min(width, height) * 0.38,
        colorKey: 'dominant'
      }
    ];

    let t = 0;

    const render = () => {
      t += 0.01;
      ctx.clearRect(0, 0, width, height);

      // Deep dark base background
      ctx.fillStyle = '#06060a';
      ctx.fillRect(0, 0, width, height);

      const bassFactor = isPlaying ? audioEnergy.bass * 0.35 : 0;
      const trebleFactor = isPlaying ? audioEnergy.treble * 0.2 : 0;

      // Update and draw orbs
      for (const orb of orbs) {
        orb.x += orb.vx * (isPlaying ? 1.2 : 0.6);
        orb.y += orb.vy * (isPlaying ? 1.2 : 0.6);

        // Bounce gently against boundaries
        if (orb.x < width * 0.1 || orb.x > width * 0.9) orb.vx *= -1;
        if (orb.y < height * 0.1 || orb.y > height * 0.9) orb.vy *= -1;

        // Pulse radius with bass
        orb.radius = orb.baseRadius * (1 + bassFactor + Math.sin(t + orb.x * 0.01) * 0.08);

        const color = palette[orb.colorKey] || palette.dominant;

        const grad = ctx.createRadialGradient(
          orb.x,
          orb.y,
          0,
          orb.x,
          orb.y,
          orb.radius
        );

        grad.addColorStop(0, color.replace(')', ', 0.32)').replace('rgb', 'rgba'));
        grad.addColorStop(0.5, color.replace(')', ', 0.14)').replace('rgb', 'rgba'));
        grad.addColorStop(1, 'rgba(6, 6, 10, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle noise / fine grain overlay
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
      className="fixed inset-0 pointer-events-none z-0 select-none filter blur-2xl opacity-90 transition-opacity duration-700"
    />
  );
};
