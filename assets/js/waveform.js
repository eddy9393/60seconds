/**
 * waveform.js
 * Echte frequentie-visualisatie via Web Audio API.
 * Valt terug op de CSS-animatie als audio analyse niet beschikbaar is.
 */
(function () {
  const canvas   = document.getElementById('waveformCanvas');
  const fallback = document.querySelector('.waveform-fallback');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let audioCtx, analyser, source, rafId;
  let isConnected = false;
  let isPaused    = true;

  // ── Grootte ────────────────────────────────────────────────
  function resize() {
    const wrap = canvas.parentElement;
    canvas.width  = wrap.offsetWidth  * devicePixelRatio;
    canvas.height = wrap.offsetHeight * devicePixelRatio;
    canvas.style.width  = wrap.offsetWidth  + 'px';
    canvas.style.height = wrap.offsetHeight + 'px';
  }

  window.addEventListener('resize', resize);
  resize();

  // ── Connect audio element ──────────────────────────────────
  function connect(audioEl) {
    if (isConnected) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.82;
      source = audioCtx.createMediaElementSource(audioEl);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      isConnected = true;

      // Verberg fallback, toon canvas
      if (fallback) fallback.style.display = 'none';
      canvas.style.display = 'block';

      draw();
    } catch (e) {
      console.warn('[waveform] Web Audio niet beschikbaar:', e.message);
      showFallback();
    }
  }

  function showFallback() {
    canvas.style.display = 'none';
    if (fallback) fallback.style.display = '';
  }

  // ── Draw loop ──────────────────────────────────────────────
  function draw() {
    rafId = requestAnimationFrame(draw);

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!analyser) return;

    const bufLen = analyser.frequencyBinCount;
    const data   = new Uint8Array(bufLen);
    analyser.getByteFrequencyData(data);

    // Controleer of er echt signaal is
    const hasSignal = data.some(v => v > 4);

    // Bar configuratie
    const bars   = 28;
    const gap    = 3 * devicePixelRatio;
    const barW   = (W - gap * (bars - 1)) / bars;
    const step   = Math.floor(bufLen / bars);

    // Goud kleurverloop
    const grad = ctx.createLinearGradient(0, H, 0, 0);
    grad.addColorStop(0,   'rgba(180,130,30,0.85)');
    grad.addColorStop(0.5, 'rgba(212,175,55,0.95)');
    grad.addColorStop(1,   'rgba(244,215,122,0.75)');

    ctx.fillStyle = grad;

    for (let i = 0; i < bars; i++) {
      const val = hasSignal ? data[i * step] / 255 : 0;

      // Minimale hoogte zodat er altijd iets te zien is
      const minH  = H * 0.06;
      const barH  = hasSignal
        ? Math.max(minH, val * H * 0.92)
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

  // ── Pauzeer animatie als audio gepauzeerd is ──────────────
  function syncPause(paused) {
    isPaused = paused;
    if (audioCtx && paused && audioCtx.state === 'running') {
      // laat de draw loop gewoon doorgaan — bars vallen terug naar minH
    }
  }

  // ── Publieke API ──────────────────────────────────────────
  // index.js kan dit aanroepen na play()
  window.WaveformViz = {
    connect: connect,
    syncPause: syncPause,
    showFallback: showFallback,
  };

  // Auto-detect: wacht tot SSFMApp beschikbaar is en hook in op audio element
  let attempts = 0;
  const tryConnect = setInterval(function () {
    attempts++;
    const audioEl = document.getElementById('audio');
    if (audioEl && audioEl.src) {
      clearInterval(tryConnect);
      connect(audioEl);
    } else if (audioEl) {
      // Audio element bestaat maar src nog niet geladen
      audioEl.addEventListener('play', function onPlay() {
        audioEl.removeEventListener('play', onPlay);
        clearInterval(tryConnect);
        connect(audioEl);
      }, { once: true });
      clearInterval(tryConnect);
    }
    if (attempts > 40) {
      clearInterval(tryConnect);
      showFallback();
    }
  }, 250);

})();
