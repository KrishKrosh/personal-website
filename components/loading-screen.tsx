import { useEffect, useState } from 'react';
import { getLoadingProgress } from '@/lib/imageLoader';

export default function LoadingScreen({ onFadeComplete }: { onFadeComplete?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [loadingTime, setLoadingTime] = useState<number | null>(null);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
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
        
        // Start fade out when progress reaches 100%
        if (simulatedProgress >= 1 && !isFading) {
          setIsFading(true);
          // Wait for fade animation to complete before calling onFadeComplete
          setTimeout(() => {
            onFadeComplete?.();
          }, 1000); // Match this with the CSS transition duration
        }
      } else {
        // Normal mode - use actual loading progress
        const currentProgress = getLoadingProgress();
        setProgress(currentProgress);
        
        // Start fade out when progress reaches 100%
        if (currentProgress >= 1 && !isFading) {
          setIsFading(true);
          // Wait for fade animation to complete before calling onFadeComplete
          setTimeout(() => {
            onFadeComplete?.();
          }, 1000); // Match this with the CSS transition duration
        }
      }
    }, 100);

    const startTime = Date.now();

    return () => clearInterval(interval);
  }, [loadingTime, isFading, onFadeComplete]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-black/80">
      <div className={`ethereal-loader transition-transform duration-1000 ease-in-out ${isFading ? 'scale-90' : 'scale-100'}`}>
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>
    </div>
  );
}
