"use client";

import { useState, useEffect } from "react";
import { TextureLoader, Texture } from "three";
import { optimizeImageUrl } from "./imageLoader";

// Singleton pattern for card back texture loading
const cardBackTextureLoader = (() => {
  let texture: Texture | null = null;
  let error: any = null;
  let loading = false;
  let listeners: (() => void)[] = []; // Listener takes no arguments, just signals change

  const load = () => {
    // Don't start loading if already loaded or currently loading
    if (texture || loading) return; 

    loading = true;
    error = null; // Reset error on new attempt
    const loader = new TextureLoader();
    loader.load(
      optimizeImageUrl("/images/card-back.png", 1024, 80),
      (loadedTexture) => {
        texture = loadedTexture;
        // Apply optimizations
        texture.anisotropy = 16; 
        texture.needsUpdate = true;
        loading = false;
        notifyListeners(); // Notify subscribers about the successful load
      },
      undefined, // onProgress callback (optional)
      (err) => {
        console.warn("Card back texture failed to load:", err);
        error = err; // Store the error
        loading = false;
        notifyListeners(); // Notify subscribers about the error
      }
    );
  };

  // Function to notify all subscribed listeners
  const notifyListeners = () => {
    listeners.forEach(listener => listener());
  };

  // Function for components to subscribe to status updates
  const subscribe = (listener: () => void) => {
    listeners.push(listener);
  };

  // Function for components to unsubscribe from status updates
  const unsubscribe = (listener: () => void) => {
    listeners = listeners.filter(l => l !== listener);
  };

  // Function to get the current status
  const getStatus = () => ({
    texture: texture,
    error: error,
    loading: loading,
    loaded: !!texture, // True if texture is not null
  });

  // Expose the public API for the loader
  return {
    load,         // Function to explicitly start loading
    subscribe,
    unsubscribe,
    getStatus,
    getTexture: () => texture // Direct access to the texture if loaded
  };
})();

// Custom Hook: useCardBackTextureStatus
// This hook allows components to easily react to the texture loading status
export const useCardBackTextureStatus = () => {
  // Initialize state with the current status from the loader
  const [status, setStatus] = useState(cardBackTextureLoader.getStatus());

  useEffect(() => {
    // Define the listener function to update the hook's state
    const handleStatusChange = () => {
      setStatus(cardBackTextureLoader.getStatus());
    };

    // Subscribe to the loader's status changes when the component mounts
    cardBackTextureLoader.subscribe(handleStatusChange);
    
    // IMPORTANT: Ensure loading starts if it hasn't already. 
    // This makes sure that any component using this hook will trigger the load.
    cardBackTextureLoader.load(); 

    // Return a cleanup function to unsubscribe when the component unmounts
    return () => {
      cardBackTextureLoader.unsubscribe(handleStatusChange);
    };
  }, []); // Empty dependency array means this effect runs only on mount and unmount

  // Return the current status
  return status;
};

// Export the loader instance itself for direct access if needed (e.g., getting the texture directly)
export { cardBackTextureLoader }; 