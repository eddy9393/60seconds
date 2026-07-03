"use client";

import { useEffect, useRef } from "react";

type WaveformProps = {
  audioRef: React.RefObject<HTMLAudioElement>;
  analyserRef: React.RefObject<AnalyserNode | null>;
  isPaused: boolean;
};

export default function Waveform({ analyserRef, isPaused }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let cancelled = false;

    function resize() {
      const wrap = wrapRef.current;
      if (!wrap || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = wrap.offsetWidth * dpr;
      canvas.height = 44 * dpr;
      canvas.style.width = `${wrap.offsetWidth}px`;
      canvas.style.height = "44px";
    }

    const resizeObs = new ResizeObserver(resize);
    if (wrapRef.current) resizeObs.observe(wrapRef.current);
    resize();

    function drawIdle() {
      if (cancelled || !ctx || !canvas) return;
      const W = canvas.width;
      const H = canvas.height;
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, W, H);

      const bars = 28;
      const gap = 3 * dpr;
      const barW = (W - gap * (bars - 1)) / bars;
      const t = Date.now() / 600;

      const grad = ctx.createLinearGradient(0, H, 0, 0);
      grad.addColorStop(0, "rgba(180,130,30,0.45)");
      grad.addColorStop(0.5, "rgba(212,175,55,0.55)");
      grad.addColorStop(1, "rgba(244,215,122,0.35)");
      ctx.fillStyle = grad;

      for (let i = 0; i < bars; i++) {
        const h = H * 0.08 + Math.sin(t + i * 0.45) * H * 0.06;
        const x = i * (barW + gap);
        const y = H - h;
        const r = Math.min(barW / 2, 3 * dpr);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barW - r, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx.lineTo(x + barW, H);
        ctx.lineTo(x, H);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      }
      rafId = requestAnimationFrame(loop);
    }

    function drawFreq(analyser: AnalyserNode) {
      if (cancelled || !ctx || !canvas) return;
      const W = canvas.width;
      const H = canvas.height;
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, W, H);

      const bufLen = analyser.frequencyBinCount;
      const data = new Uint8Array(bufLen);
      analyser.getByteFrequencyData(data);

      const bars = 28;
      const gap = 3 * dpr;
      const barW = (W - gap * (bars - 1)) / bars;
      const step = Math.floor(bufLen / bars);

      const grad = ctx.createLinearGradient(0, H, 0, 0);
      grad.addColorStop(0, "rgba(180,130,30,0.85)");
      grad.addColorStop(0.5, "rgba(212,175,55,0.95)");
      grad.addColorStop(1, "rgba(244,215,122,0.75)");
      ctx.fillStyle = grad;

      const hasSignal = data.some((v) => v > 4);

      for (let i = 0; i < bars; i++) {
        const val = hasSignal ? data[i * step] / 255 : 0;
        const minH = H * 0.05;
        const barH = hasSignal
          ? Math.max(minH, val * H * 0.95)
          : minH + Math.sin(Date.now() / 400 + i * 0.4) * minH * 0.5;

        const x = i * (barW + gap);
        const y = H - barH;
        const r = Math.min(barW / 2, 4 * dpr);

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barW - r, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx.lineTo(x + barW, H);
        ctx.lineTo(x, H);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      }
      rafId = requestAnimationFrame(loop);
    }

    // Re-checks each frame whether the shared analyser (owned by the radio
    // provider) has connected yet — it may connect slightly after this
    // component mounts, or already be connected from before navigation.
    function loop() {
      const analyser = analyserRef.current;
      if (analyser) drawFreq(analyser);
      else drawIdle();
    }

    loop();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      resizeObs.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className={`waveform-wrap${isPaused ? " is-paused" : ""}`} aria-hidden="true">
      <canvas ref={canvasRef} id="waveformCanvas" className="waveform-canvas" />
    </div>
  );
}
