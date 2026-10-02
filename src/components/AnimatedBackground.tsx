import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

export const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Generate distributed edge nodes
    const particleCount = Math.min(50, Math.floor((width * height) / 28000));
    const particles: Particle[] = [];
    const colors = [
      'rgba(6, 182, 212, ',   // cyan
      'rgba(99, 102, 241, ',  // indigo
      'rgba(59, 130, 246, ',  // blue
      'rgba(168, 85, 247, '   // violet
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle connections between nearby edge nodes (simulating CDN grid)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const lineAlpha = (1 - dist / 130) * 0.12;
            ctx.strokeStyle = `rgba(56, 189, 248, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw and update edge node particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges smoothly
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle glow halo around larger nodes
        if (p.radius > 2) {
          ctx.fillStyle = `${p.color}${p.alpha * 0.25})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Deep Aurora Radial Glows */}
      <div className="absolute -top-40 left-1/4 w-[40rem] h-[40rem] bg-cyan-500/10 rounded-full blur-[128px] animate-pulse duration-[10000ms]" />
      <div className="absolute top-1/3 -right-24 w-[36rem] h-[36rem] bg-indigo-600/12 rounded-full blur-[140px] animate-pulse duration-[8000ms]" />
      <div className="absolute -bottom-32 left-1/3 w-[45rem] h-[45rem] bg-blue-600/10 rounded-full blur-[150px]" />
      
      {/* Interactive Constellation Mesh Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-80" />
    </div>
  );
};
