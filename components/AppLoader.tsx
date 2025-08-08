"use client";

import React, { useState, useEffect } from 'react';
import { useCardBackTextureStatus } from '@/lib/textureLoader'; // Import the hook
import LoadingScreen from './loading-screen'; // Import the loading screen
import CardDeckScene from './card-deck-scene'; // Use relative path
import { Suspense } from 'react';
import { useProgress } from '@react-three/drei';
import { preloadCardImages } from '@/lib/imageLoader';

export default function AppLoader() {
  const { loaded: textureLoaded, error: textureError, loading: textureLoading } = useCardBackTextureStatus();
  const [isLoading, setIsLoading] = useState(true);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { progress } = useProgress();

  // Kick off image preloading (tracked by DefaultLoadingManager)
  useEffect(() => {
    preloadCardImages().catch((error) => {
      console.warn('Preloading some images failed:', error);
    });
  }, []);

  // Check if everything is loaded
  const texturesReady = progress >= 100;
  const isEverythingLoaded = !textureLoading && textureLoaded && texturesReady && isSceneReady;

  // Handle loading complete
  const handleLoadingComplete = () => {
    if (isEverythingLoaded && !isTransitioning) {
      setIsTransitioning(true);
      // Small delay to ensure scene is fully visible
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
    }
  };

  // If there's an error, show error message
  if (textureError) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500 bg-black/80">
        <p>Failed to load essential assets. Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      {/* Card deck scene - always present under the overlay */}
      <div className={`absolute inset-0 opacity-100`}>
        <Suspense fallback={null}>
          <CardDeckScene onSceneReady={() => setIsSceneReady(true)} />
        </Suspense>
      </div>

      {/* Loading screen with semi-transparent background */}
      <div className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
        isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="absolute inset-0 bg-black/80" />
        <LoadingScreen 
          onFadeComplete={handleLoadingComplete}
          isLoading={!isEverythingLoaded}
        />
      </div>
    </div>
  );
} 