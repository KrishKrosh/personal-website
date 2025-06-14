"use client";

import React, { Suspense, useState } from 'react';
import { useCardBackTextureStatus } from '@/lib/textureLoader'; // Import the hook
import LoadingScreen from './loading-screen'; // Import the loading screen
import CardDeckScene from './card-deck-scene'; // Use relative path

export default function AppLoader() {
  // Use the hook to get the loading status of the card back texture
  const { loaded, error, loading } = useCardBackTextureStatus();
  const [isLoadingScreenVisible, setIsLoadingScreenVisible] = useState(true);

  // While loading is in progress, or if loading hasn't finished and there's no error yet,
  // display the loading screen.
  if (loading || (!loaded && !error)) {
    return (
      <div className="relative h-screen w-full">
        {/* Card deck scene is always present underneath */}
        <div className="absolute inset-0">
          <CardDeckScene />
        </div>
        
        {/* Loading screen fades out to reveal the scene underneath */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isLoadingScreenVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <LoadingScreen onFadeComplete={() => setIsLoadingScreenVisible(false)} />
        </div>
      </div>
    );
  }

  // If an error occurred during texture loading, display an error message.
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500 bg-black/80">
        <p>Failed to load essential assets. Please try refreshing the page.</p>
      </div>
    );
  }

  // If the texture is successfully loaded and there's no error, render the main CardDeckScene.
  return <CardDeckScene />;
} 