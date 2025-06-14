"use client"

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
// import CardDeckScene from "@/components/card-deck-scene"
import LoadingScreen from "@/components/loading-screen"
import AppLoader from "@/components/AppLoader"
import { preloadCardImages, areAllImagesLoaded } from '@/lib/imageLoader'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImages = async () => {
      try {
        // Check for loading time parameter in URL
        const params = new URLSearchParams(window.location.search);
        const debugLoadingTime = params.get('loadingTime');
        
        if (debugLoadingTime) {
          const time = parseInt(debugLoadingTime, 10);
          if (!isNaN(time) && time > 0) {
            // In debug mode, wait for the specified time
            await new Promise(resolve => setTimeout(resolve, time));
          }
        }

        // Start preloading images
        await preloadCardImages();
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load images:', error);
        // Even if some images fail to load, we should still show the app
        setIsLoading(false);
      }
    };

    loadImages();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black/80">
      {/* <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <h1 className="text-white text-4xl md:text-6xl font-serif tracking-wider opacity-80">pick a card. any card.</h1>
      </div> */}
      <Suspense fallback={<LoadingScreen />}>
        <AppLoader />
      </Suspense>
    </main>
  )
}

