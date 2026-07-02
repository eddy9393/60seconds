"use client";

import { useEffect, useRef } from "react";

export type TrendPoint = { date: string; value: number };

function formatAxisDate(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
}

function drawLineChart(canvas: HTMLCanvasElement, series: TrendPoint[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fillRect(0, 0, width, height);

  if (!series.length) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "500 20px Space Grotesk";
    ctx.fillText("No data yet", 36, height / 2);
    return;
  }

  const padding = { top: 30, right: 26, bottom: 56, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...series.map((point) => Number(point.value) || 0), 1);
  const ySteps = 4;

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let step = 0; step <= ySteps; step += 1) {
    const y = padding.top + (chartHeight * step) / ySteps;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const value = Math.round(maxValue - (maxValue * step) / ySteps);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "500 14px Manrope";
    ctx.fillText(String(value), 16, y + 4);
  }

  const points = series.map((point, index) => {
    const x = padding.left + (chartWidth * index) / Math.max(1, series.length - 1);
    const y = padding.top + chartHeight - ((Number(point.value) || 0) / maxValue) * chartHeight;
    return { ...point, x, y };
  });

  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, "rgba(212,175,55,0.36)");
  gradient.addColorStop(1, "rgba(212,175,55,0.02)");

  ctx.beginPath();
  ctx.moveTo(points[0].x, height - padding.bottom);
  points.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 3;
  ctx.stroke();

  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#f6dd8a";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  const labelIndexes = Array.from(new Set([0, Math.floor((series.length - 1) / 2), series.length - 1].filter((i) => i >= 0)));

  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = "500 14px Manrope";
  labelIndexes.forEach((index) => {
    const point = points[index];
    const label = formatAxisDate(point.date);
    const textWidth = ctx.measureText(label).width;
    ctx.fillText(label, Math.max(0, Math.min(width - textWidth, point.x - textWidth / 2)), height - 18);
  });
}

export default function TrendChart({ series }: { series: TrendPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawLineChart(canvas, series);

    const onResize = () => drawLineChart(canvas, series);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [series]);

  return <canvas ref={canvasRef} id="statsTrendCanvas" width={1120} height={420} aria-label="Statistics trend chart" />;
}
