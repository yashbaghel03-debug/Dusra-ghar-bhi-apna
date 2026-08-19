import React, { useEffect, useRef } from 'react';

interface IsoBuilding {
  x: number; // grid x position
  y: number; // grid y position
  w: number; // width in grid units
  h: number; // depth in grid units
  height: number; // building height in px
  color: string;
  roofColor: string;
  accentColor: string;
  name: string;
  isPg?: boolean;
  pinLabel?: string;
  pinSub?: string;
}

export const ThreeDScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 500,
    targetX: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    targetY: typeof window !== 'undefined' ? window.innerHeight / 2 : 500,
  });

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

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // Warm Marigold Floating Particles
    const particles = Array.from({ length: 30 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 1.5,
      alpha: Math.random() * 0.5 + 0.2,
      speedY: Math.random() * 0.4 + 0.1,
      speedX: (Math.random() - 0.5) * 0.2,
    }));

    // Isometric Map Configuration
    const tileW = 60;
    const tileH = 30;

    // Define DTU Neighborhood Isometric Buildings
    const buildings: IsoBuilding[] = [
      // DTU Main Campus Block
      {
        x: 0,
        y: 0,
        w: 3.5,
        h: 2.5,
        height: 120,
        color: '#2A2119',
        roofColor: '#332821',
        accentColor: '#E8A33D',
        name: 'DTU Main Campus',
        pinLabel: '🎓 DTU Campus',
        pinSub: 'Bawana Road',
      },
      // PG 1 - Near Gate 2
      {
        x: -2.5,
        y: 1.5,
        w: 1.2,
        h: 1.2,
        height: 80,
        color: '#2F241C',
        roofColor: '#3D2F24',
        accentColor: '#4C7A5E',
        name: 'Krishna Boys PG',
        isPg: true,
        pinLabel: '📍 Krishna PG',
        pinSub: '₹7,500/mo',
      },
      // PG 2 - Rohini Sec 16
      {
        x: 2.2,
        y: -1.8,
        w: 1.4,
        h: 1.2,
        height: 95,
        color: '#342920',
        roofColor: '#423429',
        accentColor: '#C1613B',
        name: 'Royal Girls PG',
        isPg: true,
        pinLabel: '📍 Royal Girls PG',
        pinSub: '₹9,200/mo',
      },
      // PG 3 - Shahbad Daulatpur Lane
      {
        x: -1.8,
        y: -2.2,
        w: 1.1,
        h: 1.1,
        height: 70,
        color: '#2A2119',
        roofColor: '#362B21',
        accentColor: '#E8A33D',
        name: 'Stanza Living DTU',
        isPg: true,
        pinLabel: '📍 Stanza House',
        pinSub: '₹11,000/mo',
      },
      // PG 4 - Commercial Market Block
      {
        x: 1.5,
        y: 2.2,
        w: 1.5,
        h: 1.0,
        height: 65,
        color: '#2D231B',
        roofColor: '#3B2E24',
        accentColor: '#E8A33D',
        name: 'Sector 17 Market PG',
        isPg: true,
        pinLabel: '📍 Campus Heights',
        pinSub: '₹8,500/mo',
      },
    ];

    let tick = 0;

    const render = () => {
      tick += 0.02;

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

      ctx.clearRect(0, 0, width, height);

      // Warm Ambient Spotlight centered around mouse
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const lightGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 600);
      lightGrad.addColorStop(0, 'rgba(232, 163, 61, 0.09)');
      lightGrad.addColorStop(0.5, 'rgba(193, 97, 59, 0.03)');
      lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lightGrad;
      ctx.fillRect(0, 0, width, height);

      // Render Floating Marigold Petal Particles
      particles.forEach((p) => {
        p.y -= p.speedY;
        p.x += p.speedX;
        if (p.y < -10) p.y = height + 10;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#E8A33D';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // Isometric Map Center Position (Parallax with mouse)
      const parallaxX = (mx - width / 2) * 0.03;
      const parallaxY = (my - height / 2) * 0.03;

      // Center map slightly to the right side of the screen on desktop
      const mapOriginX = width > 900 ? width * 0.75 + parallaxX : width * 0.5 + parallaxX;
      const mapOriginY = height * 0.48 + parallaxY;

      // Helper function to project grid (x, y) to Screen (isoX, isoY)
      const toScreen = (gx: number, gy: number, gz: number = 0) => {
        const isoX = mapOriginX + (gx - gy) * (tileW / 2);
        const isoY = mapOriginY + (gx + gy) * (tileH / 2) - gz;
        return { x: isoX, y: isoY };
      };

      // Draw Ground Grid & Road Lanes (DTU Main Road & Shahbad Lanes)
      const gridSize = 6;
      ctx.lineWidth = 1;

      // Grid tile lines
      for (let x = -gridSize; x <= gridSize; x++) {
        const p1 = toScreen(x, -gridSize);
        const p2 = toScreen(x, gridSize);
        ctx.strokeStyle = x === 0 ? 'rgba(232, 163, 61, 0.25)' : 'rgba(74, 59, 46, 0.2)';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      for (let y = -gridSize; y <= gridSize; y++) {
        const p1 = toScreen(-gridSize, y);
        const p2 = toScreen(gridSize, y);
        ctx.strokeStyle = y === 0 ? 'rgba(232, 163, 61, 0.25)' : 'rgba(74, 59, 46, 0.2)';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // Draw Main Road Ribbon (Bawana Road passing near DTU)
      const roadStart = toScreen(-5, 0);
      const roadEnd = toScreen(5, 0);
      ctx.strokeStyle = 'rgba(232, 163, 61, 0.4)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(roadStart.x, roadStart.y);
      ctx.lineTo(roadEnd.x, roadEnd.y);
      ctx.stroke();

      // Road dashed line center
      ctx.strokeStyle = '#1D1712';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(roadStart.x, roadStart.y);
      ctx.lineTo(roadEnd.x, roadEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Sort buildings by depth (back-to-front rendering)
      const sortedBuildings = [...buildings].sort((a, b) => a.x + a.y - (b.x + b.y));

      // Draw Isometric 3D Buildings
      sortedBuildings.forEach((b) => {
        const bHeight = b.height;

        // Base 4 corner points on ground
        const p0 = toScreen(b.x, b.y);
        const p1 = toScreen(b.x + b.w, b.y);
        const p2 = toScreen(b.x + b.w, b.y + b.h);
        const p3 = toScreen(b.x, b.y + b.h);

        // Top 4 corner points elevated by bHeight
        const t0 = toScreen(b.x, b.y, bHeight);
        const t1 = toScreen(b.x + b.w, b.y, bHeight);
        const t2 = toScreen(b.x + b.w, b.y + b.h, bHeight);
        const t3 = toScreen(b.x, b.y + b.h, bHeight);

        // Ground Soft Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.moveTo(p0.x + 12, p0.y + 12);
        ctx.lineTo(p1.x + 12, p1.y + 12);
        ctx.lineTo(p2.x + 12, p2.y + 12);
        ctx.lineTo(p3.x + 12, p3.y + 12);
        ctx.closePath();
        ctx.fill();

        // Left Face
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(t3.x, t3.y);
        ctx.lineTo(t0.x, t0.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.stroke();

        // Right Face
        ctx.fillStyle = '#3A2E24';
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t3.x, t3.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.stroke();

        // Roof Face
        ctx.fillStyle = b.roofColor;
        ctx.beginPath();
        ctx.moveTo(t0.x, t0.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t3.x, t3.y);
        ctx.closePath();
        ctx.fill();

        // Roof Accent Border
        ctx.strokeStyle = b.accentColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Windows lighting on faces
        const numWindowsY = Math.floor(bHeight / 25);
        for (let i = 1; i <= numWindowsY; i++) {
          const winY = p0.y - (bHeight / (numWindowsY + 1)) * i;
          ctx.fillStyle = i % 2 === 0 ? b.accentColor : '#F3E6D0';
          ctx.globalAlpha = 0.6;
          ctx.fillRect(p0.x + (p3.x - p0.x) * 0.4, winY, 5, 5);
          ctx.fillRect(p3.x + (p2.x - p3.x) * 0.4, winY + (p2.y - p3.y) * 0.4, 5, 5);
          ctx.globalAlpha = 1.0;
        }

        // Floating 3D Map Pin above Building
        if (b.pinLabel) {
          const floatOffset = Math.sin(tick * 2 + b.x) * 6;
          const pinPos = {
            x: t0.x + (t2.x - t0.x) * 0.5,
            y: t0.y + (t2.y - t0.y) * 0.5 - 28 + floatOffset,
          };

          // Pin Stem Line
          ctx.strokeStyle = b.accentColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pinPos.x, pinPos.y);
          ctx.lineTo(pinPos.x, pinPos.y + 16);
          ctx.stroke();

          // Pin Badge Container
          ctx.fillStyle = '#1D1712';
          ctx.strokeStyle = b.accentColor;
          ctx.lineWidth = 1.5;
          const labelW = 110;
          const labelH = 26;
          const rx = pinPos.x - labelW / 2;
          const ry = pinPos.y - labelH;

          ctx.beginPath();
          ctx.roundRect(rx, ry, labelW, labelH, 8);
          ctx.fill();
          ctx.stroke();

          // Pin Badge Text
          ctx.fillStyle = '#F3E6D0';
          ctx.font = 'bold 10px Manrope, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.pinLabel, pinPos.x, ry + 9);

          if (b.pinSub) {
            ctx.fillStyle = b.accentColor;
            ctx.font = 'bold 9px IBM Plex Mono, monospace';
            ctx.fillText(b.pinSub, pinPos.x, ry + 19);
          }
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
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
        zIndex: 0,
      }}
    />
  );
};

export default ThreeDScene;
