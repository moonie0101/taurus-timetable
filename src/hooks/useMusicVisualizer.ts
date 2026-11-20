import { useCallback, useEffect, useRef, useState } from "react";

class FilmGrainEffect {
  width: number;
  height: number;
  grainCanvas: HTMLCanvasElement;
  grainCtx: CanvasRenderingContext2D | null;
  grainData: ImageData | null;
  frame: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.grainCanvas = document.createElement("canvas");
    this.grainCanvas.width = width;
    this.grainCanvas.height = height;
    this.grainCtx = this.grainCanvas.getContext("2d");
    this.grainData = null;
    this.frame = 0;
    this.generateGrainPattern();
  }

  generateGrainPattern() {
    if (!this.grainCtx || this.width <= 0 || this.height <= 0) return;
    const data = this.grainCtx.createImageData(this.width, this.height);
    const buf = data.data;
    for (let i = 0; i < buf.length; i += 4) {
      const v = Math.random() * 255;
      buf[i] = v;
      buf[i + 1] = v;
      buf[i + 2] = v;
      buf[i + 3] = 255;
    }
    this.grainData = data;
  }

  update() {
    this.frame++;
    if (this.frame % 2 === 0 && this.grainData && this.grainCtx) {
      const buf = this.grainData.data;
      const t = this.frame * 0.01;
      for (let i = 0; i < buf.length; i += 4) {
        const rnd = Math.random();
        const x = (i / 4) % this.width;
        const y = Math.floor(i / 4 / this.width);
        const wave = Math.sin(x * 0.01 + t) * Math.cos(y * 0.01 - t);
        const val = (rnd * 0.8 + wave * 0.2) * 255;
        buf[i] = val;
        buf[i + 1] = val;
        buf[i + 2] = val;
      }
      this.grainCtx.putImageData(this.grainData, 0, 0);
    }
  }

  apply(
    ctx: CanvasRenderingContext2D,
    intensity = 0.05,
    colorize = true,
    hue = 0
  ) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = intensity * 0.5;
    ctx.drawImage(this.grainCanvas, 0, 0);
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 1 - intensity * 0.3;
    ctx.drawImage(this.grainCanvas, 0, 0);
    if (colorize) {
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = intensity * 0.3;
      ctx.fillStyle = `hsla(${hue}, 50%, 50%, 1)`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    ctx.restore();
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.grainCanvas.width = width;
    this.grainCanvas.height = height;
    this.generateGrainPattern();
  }
}

export function useMusicVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [audioProgress, setAudioProgress] = useState(0);

  const initAudioContext = useCallback(() => {
    if (!audioRef.current || audioCtxRef.current) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      ctx.createMediaElementSource(audioRef.current).connect(analyser);
      analyser.connect(ctx.destination);
    } catch (err) {
      console.error("Error initializing audio:", err);
    }
  }, []);

  const setupVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = {
      bassIntensity: 0,
      midIntensity: 0,
      trebleIntensity: 0,
      time: 0,
      filmGrain: new FilmGrainEffect(window.innerWidth, window.innerHeight),
      colorState: {
        hue: 30,
        targetHue: 30,
        saturation: 80,
        targetSaturation: 80,
        lightness: 50,
        targetLightness: 50,
      },
      waves: [
        { amplitude: 30, frequency: 0.003, speed: 0.02, offset: 0, opacity: 0.9 },
        {
          amplitude: 25,
          frequency: 0.004,
          speed: 0.015,
          offset: Math.PI * 0.5,
          opacity: 0.7,
        },
        {
          amplitude: 20,
          frequency: 0.005,
          speed: 0.025,
          offset: Math.PI,
          opacity: 0.5,
        },
        {
          amplitude: 35,
          frequency: 0.002,
          speed: 0.01,
          offset: Math.PI * 1.5,
          opacity: 0.6,
        },
      ],
      bassHistory: new Array<number>(20).fill(0),
      postProcessing: {
        filmGrainIntensity: 0.04,
        vignetteIntensity: 0.4,
        chromaticAberration: 0.8,
        scanlineIntensity: 0.02,
      },
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      state.filmGrain.resize(canvas.width, canvas.height);
    };
    handleResize();

    const renderFrame = () => {
      rafRef.current = requestAnimationFrame(renderFrame);
      ctx.fillStyle = "rgba(0, 0, 0, 0.92)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let bass = 0;
      let mid = 0;
      let treble = 0;
      const isAudioPlaying = audioRef.current && !audioRef.current.paused;

      if (analyserRef.current && isAudioPlaying) {
        const bins = analyserRef.current.frequencyBinCount;
        const freqData = new Uint8Array(bins);
        analyserRef.current.getByteFrequencyData(freqData);

        let bSum = 0;
        for (let i = 0; i < 30; i++) bSum += freqData[i];
        bass = bSum / 7650;

        let mSum = 0;
        for (let i = 30; i < 200; i++) mSum += freqData[i];
        mid = mSum / 43350;

        let tSum = 0;
        for (let i = 200; i < 800; i++) tSum += freqData[i];
        treble = tSum / (600 * 255);

        state.bassHistory.shift();
        state.bassHistory.push(bass);
        const avgBass =
          state.bassHistory.reduce((acc, v) => acc + v, 0) /
          state.bassHistory.length;

        state.bassIntensity = avgBass;
        state.midIntensity = mid;
        state.trebleIntensity = treble;

        if (bass > mid && bass > treble) {
          state.colorState.targetHue = bass * 30;
          state.colorState.targetSaturation = 80 + bass * 20;
          state.colorState.targetLightness = 50 + bass * 10;
        } else if (mid > treble) {
          state.colorState.targetHue = 40 + mid * 80;
          state.colorState.targetSaturation = 20 + mid * 30;
          state.colorState.targetLightness = 55 + mid * 15;
        } else {
          state.colorState.targetHue = 200 + treble * 80;
          state.colorState.targetSaturation = 20 + treble * 40;
          state.colorState.targetLightness = 60 + treble * 10;
        }
        state.postProcessing.filmGrainIntensity = 0.03 + bass * 0.2;
        state.postProcessing.chromaticAberration = treble * 0.5;
      } else {
        state.bassIntensity = 0.4 + Math.sin(state.time * 0.01) * 0.3;
        state.midIntensity = 0.3 + Math.sin(state.time * 0.015) * 0.2;
        state.trebleIntensity = 0.2 + Math.sin(state.time * 0.02) * 0.1;
        state.colorState.targetHue = 180 + Math.sin(state.time * 0.005) * 180;
        state.colorState.targetSaturation = 70 + Math.sin(state.time * 0.01) * 30;
        state.colorState.targetLightness = 50 + Math.sin(state.time * 0.008) * 20;
      }

      state.colorState.hue += (state.colorState.targetHue - state.colorState.hue) * 0.5;
      state.colorState.saturation +=
        (state.colorState.targetSaturation - state.colorState.saturation) * 0.2;
      state.colorState.lightness +=
        (state.colorState.targetLightness - state.colorState.lightness) * 0.1;
      state.time++;

      const centerY = canvas.height / 2;
      state.waves.forEach((wave, idx) => {
        wave.offset += wave.speed * (1 + state.bassIntensity * 0.8);
        const factor = idx < 2 ? state.bassIntensity : state.midIntensity;
        const amp = wave.amplitude * (1 + factor * 5);
        const hue = state.colorState.hue + idx * 15;
        const sat = state.colorState.saturation - idx * 5;
        const light = state.colorState.lightness + idx * 5;
        const grad = ctx.createLinearGradient(0, centerY - amp, 0, centerY + amp);
        const alpha = wave.opacity * (0.5 + state.bassIntensity * 0.5);
        grad.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, 0)`);
        grad.addColorStop(0.5, `hsla(${hue}, ${sat}%, ${light + 10}%, ${alpha})`);
        grad.addColorStop(1, `hsla(${hue}, ${sat}%, ${light}%, 0)`);

        ctx.beginPath();
        for (let x = -50; x <= canvas.width + 50; x += 2) {
          const y1 = Math.sin(x * wave.frequency + wave.offset) * amp;
          const y2 =
            Math.sin(x * wave.frequency * 2 + wave.offset * 1.5) *
            (amp * 0.3 * state.midIntensity);
          const y3 =
            Math.sin(x * wave.frequency * 0.5 + wave.offset * 0.7) * (amp * 0.5);
          const y = centerY + y1 + y2 + y3;
          if (x === -50) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width + 50, canvas.height);
        ctx.lineTo(-50, canvas.height);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      });

      state.filmGrain.update();
      state.filmGrain.apply(
        ctx,
        state.postProcessing.filmGrainIntensity,
        true,
        state.colorState.hue
      );

      ctx.strokeStyle = `rgba(0, 0, 0, ${state.postProcessing.scanlineIntensity})`;
      ctx.lineWidth = 1;
      for (let y = 0; y < canvas.height; y += 3) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const vignette = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.2,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.9
      );
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(
        0.5,
        `rgba(0, 0, 0, ${state.postProcessing.vignetteIntensity * 0.3})`
      );
      vignette.addColorStop(
        0.8,
        `rgba(0, 0, 0, ${state.postProcessing.vignetteIntensity * 0.6})`
      );
      vignette.addColorStop(1, `rgba(0, 0, 0, ${state.postProcessing.vignetteIntensity})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    rafRef.current = requestAnimationFrame(renderFrame);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    } else {
      initAudioContext();
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Error playing audio:", err));
    }
  }, [isPlaying, initAudioContext]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      setAudioProgress((audio.currentTime / audio.duration) * 100);
    }
  }, []);

  useEffect(() => setupVisualizer(), [setupVisualizer]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onCanPlay = () => setIsLoading(false);
    const onError = () => setIsLoading(false);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [handleTimeUpdate]);

  return {
    canvasRef,
    audioRef,
    isPlaying,
    isLoading,
    audioProgress,
    togglePlayback,
  };
}
