import { useEffect, useState } from 'react';
import { getLoadingProgress } from '@/lib/imageLoader';

interface LoadingScreenProps {
  onFadeComplete?: () => void;
  isLoading: boolean;
}

export default function LoadingScreen({ onFadeComplete, isLoading }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [loadingTime, setLoadingTime] = useState<number | null>(null);
  const [hasNotifiedComplete, setHasNotifiedComplete] = useState(false);

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

    // Update progress every 100ms
    const interval = setInterval(() => {
      if (loadingTime) {
        // In debug mode, simulate progress based on time
        const elapsed = Date.now() - startTime;
        const simulatedProgress = Math.min(elapsed / loadingTime, 1);
        setProgress(simulatedProgress);
        
        // Notify parent when progress reaches 100%
        if (simulatedProgress >= 1 && !hasNotifiedComplete) {
          setHasNotifiedComplete(true);
          onFadeComplete?.();
        }
      } else {
        // Normal mode - use actual loading progress
        const currentProgress = getLoadingProgress();
        setProgress(currentProgress);
        
        // Notify parent when progress reaches 100%
        if (currentProgress >= 1 && !hasNotifiedComplete) {
          setHasNotifiedComplete(true);
          onFadeComplete?.();
        }
      }
    }, 100);

    const startTime = Date.now();

    // When loading is complete, notify parent
    if (!isLoading && !hasNotifiedComplete) {
      setHasNotifiedComplete(true);
      onFadeComplete?.();
    }

    return () => clearInterval(interval);
  }, [loadingTime, onFadeComplete, isLoading, hasNotifiedComplete]);

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
