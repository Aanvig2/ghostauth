import { useEffect, useRef } from 'react';

export default function TrustScoreRing({ score, level }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const displayScore = useRef(score);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2, cy = size / 2;
    const radius = size * 0.38;
    const target = score;

    const colorMap = {
      TRUSTED: '#22c55e',
      WATCH: '#eab308',
      SUSPECT: '#f97316',
      THREAT: '#ef4444',
    };
    const color = colorMap[level.level] || '#22c55e';

    function draw(current) {
      ctx.clearRect(0, 0, size, size);

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 14;
      ctx.stroke();

      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = color;

      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (current / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      for (let i = 0; i < 20; i++) {
        const angle = -Math.PI / 2 + (i / 20) * Math.PI * 2;
        const inner = radius - 20;
        const outer = radius - 14;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
        ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.font = `bold ${size * 0.22}px "Space Grotesk", monospace`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.fillText(Math.round(current), cx, cy - 10);
      ctx.shadowBlur = 0;

      ctx.font = `${size * 0.075}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText('TRUST SCORE', cx, cy + size * 0.12);

      ctx.font = `bold ${size * 0.07}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = color;
      ctx.fillText(level.label.toUpperCase(), cx, cy + size * 0.22);
    }

    function animate() {
      const current = displayScore.current;
      if (Math.abs(current - target) > 0.5) {
        displayScore.current += (target - current) * 0.12;
      } else {
        displayScore.current = target;
      }
      draw(displayScore.current);
      animRef.current = requestAnimationFrame(animate);
    }

    cancelAnimationFrame(animRef.current);
    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [score, level]);

  return (
    <canvas
      ref={canvasRef}
      width={220}
      height={220}
      className="drop-shadow-2xl"
    />
  );
}
