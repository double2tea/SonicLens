import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Play, Pause } from 'lucide-react';

type WebKitAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const createAudioContext = (): AudioContext => {
  const AudioContextConstructor =
    window.AudioContext ?? (window as WebKitAudioWindow).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('当前浏览器不支持音频解码。');
  }

  return new AudioContextConstructor();
};

interface WaveformPlayerProps {
  file: File;
  autoPlay?: boolean;
}

export interface WaveformPlayerRef {
  seekTo: (timeInSeconds: number) => void;
}

const WaveformPlayer = forwardRef<WaveformPlayerRef, WaveformPlayerProps>(({ file, autoPlay = false }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isDecoding, setIsDecoding] = useState(false);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    seekTo: (timeInSeconds: number) => {
      if (audioRef.current) {
        // Clamp time
        const safeTime = Math.max(0, Math.min(timeInSeconds, audioRef.current.duration || 0));
        audioRef.current.currentTime = safeTime;
        setCurrentTime(safeTime);
        if (!isPlaying) {
            audioRef.current.play().catch(e => console.error("Play failed", e));
            setIsPlaying(true);
        }
      }
    }
  }));

  // Initialize Audio
  useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0); // Reset visual position on end, or keep it at end
    });

    if (autoPlay) {
      audio.play().catch(e => console.log("Autoplay blocked", e));
      setIsPlaying(true);
    }

    return () => {
      audio.pause();
      audio.src = '';
      URL.revokeObjectURL(url);
    };
  }, [file, autoPlay]);

  // Generate Waveform Data
  useEffect(() => {
    const generateWaveform = async () => {
      setIsDecoding(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const audioContext = createAudioContext();
        
        // Handle decoding errors (often happens with video files in some browsers)
        try {
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const rawData = audioBuffer.getChannelData(0);
            const samples = 200; // Number of bars
            const blockSize = Math.floor(rawData.length / samples);
            const filteredData = [];

            for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(rawData[i * blockSize + j]);
            }
            filteredData.push(sum / blockSize);
            }

            // Normalize
            const multiplier = Math.pow(Math.max(...filteredData), -1);
            setWaveform(filteredData.map(n => n * multiplier));
        } catch (decodeErr) {
            console.warn("Could not decode audio data for waveform visualization (might be a video file restriction). Using fallback visualization.", decodeErr);
            // Fallback: Generate a fake nice looking pattern
            setWaveform(Array.from({length: 200}, () => 0.2 + Math.random() * 0.3));
        }
        
        audioContext.close();
      } catch (e) {
        console.error("Error processing audio", e);
      } finally {
        setIsDecoding(false);
      }
    };

    generateWaveform();
  }, [file]);

  // Draw Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveform.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const barWidth = width / waveform.length;
    const gap = 1;
    const effectiveBarWidth = barWidth - gap;

    waveform.forEach((val, index) => {
      const x = index * barWidth;
      const barHeight = val * height * 0.8; // Scale height
      const y = (height - barHeight) / 2;

      // Color based on progress
      const progress = currentTime / duration;
      const barProgress = index / waveform.length;
      
      if (barProgress < progress) {
        ctx.fillStyle = '#ff4e00'; // Accent (Played)
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // Unplayed
      }

      // Rounded bars
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(1, effectiveBarWidth), barHeight, 2);
      ctx.fill();
    });
  }, [waveform, currentTime, duration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percent * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full glass-panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      <div 
        ref={containerRef}
        className="relative h-24 w-full cursor-pointer group"
        onClick={handleSeek}
      >
        <canvas 
            ref={canvasRef} 
            className="w-full h-full block"
        />
        {/* Hover line effect */}
        <div className="absolute top-0 bottom-0 w-[1px] bg-white/50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" style={{ left: '0%' }} />
      </div>

      <div className="flex justify-center">
        <button 
          onClick={togglePlay}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--color-accent)] hover:bg-orange-500 text-white shadow-lg shadow-[var(--color-accent)]/30 transition-all active:scale-95"
        >
          {isPlaying ? <Pause fill="white" size={20} /> : <Play fill="white" size={20} className="ml-1" />}
        </button>
      </div>
    </div>
  );
});

export default WaveformPlayer;
