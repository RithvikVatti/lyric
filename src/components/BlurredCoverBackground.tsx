import React from 'react';

interface BlurredCoverBackgroundProps {
  coverUrl: string;
}

export const BlurredCoverBackground: React.FC<BlurredCoverBackgroundProps> = ({ coverUrl }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-black">
      {/* Heavily Blurred Album Art Fill */}
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-125 filter blur-[75px] saturate-[185%] brightness-[0.42] transition-all duration-1000 ease-out transform"
          aria-hidden="true"
        />
      ) : null}

      {/* Deep Radial Vignette Overlay for Depth & Contrast */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-black/80 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 45% 50%, transparent 25%, rgba(0, 0, 0, 0.75) 100%)'
        }}
        aria-hidden="true"
      />

      {/* Subtle Fine Grain to Eliminate Color Banding */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
        aria-hidden="true"
      />
    </div>
  );
};
