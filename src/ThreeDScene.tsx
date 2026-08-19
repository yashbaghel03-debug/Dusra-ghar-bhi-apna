import React, { useEffect, useRef } from 'react';

interface Shape3D {
  x: number;
  y: number;
  z: number; // depth
  rx: number;
  ry: number;
  rz: number;
  vrx: number;
  vry: number;
  vrz: number;
  size: number;
  type: 'cube' | 'pyramid' | 'octahedron' | 'ring';
  color: string;
  glowColor: string;
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

    // Initialize 3D Floating Geometry
    const colors = [
      { fill: 'rgba(99, 102, 241, 0.15)', glow: 'rgba(99, 102, 241, 0.4)', stroke: 'rgba(165, 180, 252, 0.5)' },
      { fill: 'rgba(168, 85, 247, 0.15)', glow: 'rgba(168, 85, 247, 0.4)', stroke: 'rgba(216, 180, 254, 0.5)' },
      { fill: 'rgba(6, 182, 212, 0.15)', glow: 'rgba(6, 182, 212, 0.4)', stroke: 'rgba(165, 243, 252, 0.5)' },
      { fill: 'rgba(16, 185, 129, 0.15)', glow: 'rgba(16, 185, 129, 0.4)', stroke: 'rgba(110, 231, 183, 0.5)' },
    ];

    const shapes: Shape3D[] = Array.from({ length: 18 }).map((_, i) => {
      const c = colors[i % colors.length];
      const types: ('cube' | 'pyramid' | 'octahedron' | 'ring')[] = ['cube', 'pyramid', 'octahedron', 'ring'];
      return {
        x: (Math.random() - 0.5) * width * 1.2,
        y: (Math.random() - 0.5) * height * 1.2,
        z: Math.random() * 400 + 100,
        rx: Math.random() * Math.PI * 2,
        ry: Math.random() * Math.PI * 2,
        rz: Math.random() * Math.PI * 2,
        vrx: (Math.random() - 0.5) * 0.012,
        vry: (Math.random() - 0.5) * 0.012,
        vrz: (Math.random() - 0.5) * 0.012,
        size: Math.random() * 35 + 20,
        type: types[Math.floor(Math.random() * types.length)],
        color: c.stroke,
        glowColor: c.glow,
      };
    });

    // Particle Stars
    const particles = Array.from({ length: 65 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.6 + 0.2,
      speed: Math.random() * 0.3 + 0.1,
    }));

    // Rendering 3D math & projection
    const fov = 400;

    const project = (x: number, y: number, z: number) => {
      const scale = fov / (fov + z);
      return {
        x: width / 2 + x * scale,
        y: height / 2 + y * scale,
        scale,
      };
    };

    const rotateX = (x: number, y: number, z: number, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { x, y: y * cos - z * sin, z: y * sin + z * cos };
    };

    const rotateY = (x: number, y: number, z: number, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { x: x * cos + z * sin, y, z: -x * sin + z * cos };
    };

    const rotateZ = (x: number, y: number, z: number, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { x: x * cos - y * sin, y: x * sin + y * cos, z };
    };

    const drawCube = (size: number) => {
      const s = size / 2;
      const vertices = [
        { x: -s, y: -s, z: -s },
        { x: s, y: -s, z: -s },
        { x: s, y: s, z: -s },
        { x: -s, y: s, z: -s },
        { x: -s, y: -s, z: s },
        { x: s, y: -s, z: s },
        { x: s, y: s, z: s },
        { x: -s, y: s, z: s },
      ];

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ];

      return { vertices, edges };
    };

    const render = () => {
      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Draw Dynamic Mouse Cinematic Light Spotlight
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const lightGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 550);
      lightGrad.addColorStop(0, 'rgba(99, 102, 241, 0.14)');
      lightGrad.addColorStop(0.4, 'rgba(168, 85, 247, 0.06)');
      lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lightGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw Background Particles
      ctx.fillStyle = '#ffffff';
      particles.forEach(p => {
        p.y -= p.speed;
        if (p.y < 0) p.y = height;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // Draw 3D Shapes
      shapes.forEach(shape => {
        shape.rx += shape.vrx;
        shape.ry += shape.vry;
        shape.rz += shape.vrz;

        // Subtle mouse interaction wobble
        const mouseOffsetX = (mx - width / 2) * 0.15;
        const mouseOffsetY = (my - height / 2) * 0.15;

        const posX = shape.x + mouseOffsetX * (100 / shape.z);
        const posY = shape.y + mouseOffsetY * (100 / shape.z);

        const geom = drawCube(shape.size);
        
        // Transform vertices
        const projectedVertices = geom.vertices.map(v => {
          let r = rotateX(v.x, v.y, v.z, shape.rx);
          r = rotateY(r.x, r.y, r.z, shape.ry);
          r = rotateZ(r.x, r.y, r.z, shape.rz);

          const proj = project(r.x + posX, r.y + posY, r.z + shape.z);
          return proj;
        });

        // Draw Glow Edges
        ctx.shadowColor = shape.glowColor;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = shape.color;
        ctx.lineWidth = 1.5;

        geom.edges.forEach(([i, j]) => {
          const v1 = projectedVertices[i];
          const v2 = projectedVertices[j];
          ctx.beginPath();
          ctx.moveTo(v1.x, v1.y);
          ctx.lineTo(v2.x, v2.y);
          ctx.stroke();
        });

        ctx.shadowBlur = 0; // reset shadow
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
