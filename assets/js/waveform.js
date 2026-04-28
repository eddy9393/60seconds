/**
 * waveform.js v2
 * Echte frequentie-visualisatie via Web Audio API.
 * Canvas is altijd actief — geen CSS fallback.
 */
(function () {
  const canvas = document.getElementById('waveformCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let audioCtx, analyser, source, rafId;
  let isConnected = false;
  let animRunning = false;

  // ── Grootte ────────────────────────────────────────────────
  function resize() {
    const wrap = canvas.parentElement;
    if (!wrap) return;
    canvas.width  = wrap.offsetWidth  * devicePixelRatio;
    canvas.height = 44 * devicePixelRatio;
    canvas.style.width  = wrap.offsetWidth + 'px';
    canvas.style.height = '44px';
  }

  const resizeObs = new ResizeObserver(resize);
  resizeObs.observe(canvas.parentElement);
  resize();

  // ── Idle animatie (voor Web Audio verbonden is) ────────────
  function drawIdle() {
    if (isConnected) return;
    animRunning = true;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const bars  = 28;
    const gap   = 3 * devicePixelRatio;
    const barW  = (W - gap * (bars - 1)) / bars;
    const t     = Date.now() / 600;

    const grad = ctx.createLinearGradient(0, H, 0, 0);
    grad.addColorStop(0,   'rgba(180,130,30,0.45)');
    grad.addColorStop(0.5, 'rgba(212,175,55,0.55)');
    grad.addColorStop(1,   'rgba(244,215,122,0.35)');
    ctx.fillStyle = grad;

    for (let i = 0; i < bars; i++) {
      const h   = H * 0.08 + Math.sin(t + i * 0.45) * H * 0.06;
      const x   = i * (barW + gap);
      const y   = H - h;
      const r   = Math.min(barW / 2, 3 * devicePixelRatio);
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
    rafId = requestAnimationFrame(drawIdle);
  }

  // ── Frequentie-animatie (na Web Audio verbonden) ───────────
  function drawFreq() {
    rafId = requestAnimationFrame(drawFreq);
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const bufLen = analyser.frequencyBinCount;
    const data   = new Uint8Array(bufLen);
    analyser.getByteFrequencyData(data);

    const bars  = 28;
    const gap   = 3 * devicePixelRatio;
    const barW  = (W - gap * (bars - 1)) / bars;
    const step  = Math.floor(bufLen / bars);

    const grad = ctx.createLinearGradient(0, H, 0, 0);
    grad.addColorStop(0,   'rgba(180,130,30,0.85)');
    grad.addColorStop(0.5, 'rgba(212,175,55,0.95)');
    grad.addColorStop(1,   'rgba(244,215,122,0.75)');
    ctx.fillStyle = grad;

    const hasSignal = data.some(v => v > 4);

    for (let i = 0; i < bars; i++) {
      const val   = hasSignal ? data[i * step] / 255 : 0;
      const minH  = H * 0.05;
      const barH  = hasSignal
        ? Math.max(minH, val * H * 0.95)
        : minH + Math.sin(Date.now() / 400 + i * 0.4) * minH * 0.5;

      const x = i * (barW + gap);
      const y = H - barH;
      const r = Math.min(barW / 2, 4 * devicePixelRatio);

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
  }

  // ── Connect audio element ──────────────────────────────────
  function connect(audioEl) {
    if (isConnected) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.80;
      source = audioCtx.createMediaElementSource(audioEl);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      isConnected = true;

      cancelAnimationFrame(rafId);
      drawFreq();
    } catch (e) {
      console.warn('[waveform] Web Audio fout:', e.message);
      // Canvas blijft idle animatie tonen
    }
  }

  // Start idle animatie direct
  drawIdle();

  // ── Publieke API ───────────────────────────────────────────
  window.WaveformViz = { connect };

  // Auto-detect audio element
  function tryAttach() {
    const audioEl = document.getElementById('audio');
    if (!audioEl) return;

    if (audioEl.src && !audioEl.paused) {
      connect(audioEl);
    } else {
      const onPlay = function() {
        connect(audioEl);
        audioEl.removeEventListener('play', onPlay);
      };
      audioEl.addEventListener('play', onPlay);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryAttach);
  } else {
    tryAttach();
  }
})();
