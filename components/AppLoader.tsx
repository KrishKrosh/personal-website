"use client";

import React, { Suspense } from 'react';
import { useCardBackTextureStatus } from '@/lib/textureLoader'; // Import the hook
import LoadingScreen from './loading-screen'; // Import the loading screen
import CardDeckScene from './card-deck-scene'; // Use relative path

export default function AppLoader() {
  // Use the hook to get the loading status of the card back texture
  const { loaded, error, loading } = useCardBackTextureStatus();

  // While loading is in progress, or if loading hasn't finished and there's no error yet,
  // display the loading screen.
  if (loading || (!loaded && !error)) {
    return <LoadingScreen />;
  }

  // If an error occurred during texture loading, display an error message.
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500 bg-zinc-900">
        <p>Failed to load essential assets. Please try refreshing the page.</p>
      </div>
    );
  }

  // If the texture is successfully loaded and there's no error, render the main CardDeckScene.
  // We wrap CardDeckScene in Suspense again in case CardDeckScene itself 
  // has internal lazy-loaded components or data fetching.
  return (
     <Suspense fallback={<LoadingScreen />}> 
       <CardDeckScene />
     </Suspense>
  );
} 