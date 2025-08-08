import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

interface LoadingScreenProps {
  onFadeComplete?: () => void;
  isLoading: boolean;
}

export default function LoadingScreen({ onFadeComplete, isLoading }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [loadingTime, setLoadingTime] = useState<number | null>(null);
  const [hasNotifiedComplete, setHasNotifiedComplete] = useState(false);
  const { progress: r3fProgress } = useProgress();

  useEffect(() => {
    // Reset notification state when loading starts
    if (isLoading) {
      setHasNotifiedComplete(false);
    }

    // Check for loading time parameter in URL
    const params = new URLSearchParams(window.location.search);
    const debugLoadingTime = params.get('loadingTime');
    
    if (debugLoadingTime) {
      const time = parseInt(debugLoadingTime, 10);
      if (!isNaN(time) && time > 0) {
        setLoadingTime(time);
        console.log(`Debug mode: Setting loading time to ${time}ms`);
      }
    }

    // Update progress from R3F useProgress if not simulating
    let interval: number | undefined;
    const startTime = Date.now();
    const tick = () => {
      if (loadingTime) {
        const elapsed = Date.now() - startTime;
        const simulatedProgress = Math.min(elapsed / loadingTime, 1);
        setProgress(simulatedProgress);
        if (simulatedProgress >= 1 && !hasNotifiedComplete) {
          setHasNotifiedComplete(true);
          onFadeComplete?.();
        }
      } else {
        const normalized = Math.min(Math.max(r3fProgress / 100, 0), 1);
        setProgress(normalized);
        if (normalized >= 1 && !hasNotifiedComplete) {
          setHasNotifiedComplete(true);
          onFadeComplete?.();
        }
      }
    };
    interval = window.setInterval(tick, 100);

    // When loading is complete, notify parent
    if (!isLoading && !hasNotifiedComplete) {
      setHasNotifiedComplete(true);
      onFadeComplete?.();
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [loadingTime, onFadeComplete, isLoading, hasNotifiedComplete, r3fProgress]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-black/80">
      <div className="ethereal-loader">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>
    </div>
  );
}
