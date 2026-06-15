'use client';

import { useEffect, useRef, useState } from 'react';
import type { BackgroundConfig } from '@/lib/types/background-config';

type Phase = 'blur' | 'poster' | 'video';
const TRANSITION = 'transition-opacity duration-[400ms] ease-in-out';

export function BackgroundVideoClient({ config, blurDataUrl }: { config: BackgroundConfig; blurDataUrl?: string | null }) {
  const [phase, setPhase] = useState<Phase>('blur');
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);

  const handlePosterLoad = () => setPhase('poster');

  // Если poster уже в кеше браузера — onLoad не срабатывает, проверяем complete
  useEffect(() => {
    if (!config.bg_video_poster_url) return;
    const img = posterRef.current;
    if (img?.complete) setPhase('poster');
  }, [config.bg_video_poster_url]);

  useEffect(() => {
    if (phase !== 'poster') return;
    const timer = setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;
      video.addEventListener('canplay', () => setPhase('video'), { once: true });
      video.load();
    }, 800);
    return () => clearTimeout(timer);
  }, [phase]);

  // Если нет poster — пропустить фазу blur и сразу показать video
  useEffect(() => {
    if (!config.bg_video_poster_url) setPhase('poster');
  }, [config.bg_video_poster_url]);

  return (
    <>
      {blurDataUrl && (
        <div
          className={`absolute bg-cover bg-center ${TRANSITION} ${phase === 'blur' ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundImage: `url(${blurDataUrl})`,
            inset: '-20px',
            filter: 'blur(20px)',
            transform: 'scale(1.05)',
          }}
        />
      )}

      {config.bg_video_poster_url && (
        <img
          ref={posterRef}
          src={config.bg_video_poster_url}
          onLoad={handlePosterLoad}
          className={`absolute inset-0 w-full h-full object-cover ${TRANSITION} ${phase === 'poster' ? 'opacity-100' : 'opacity-0'}`}
          alt=""
          fetchPriority="low"
        />
      )}

      {(phase === 'poster' || phase === 'video') && config.bg_video_url && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          className={`absolute inset-0 w-full h-full object-cover ${TRANSITION} ${phase === 'video' ? 'opacity-100' : 'opacity-0'}`}
        >
          <source src={config.bg_video_url} type="video/mp4" />
        </video>
      )}
    </>
  );
}
