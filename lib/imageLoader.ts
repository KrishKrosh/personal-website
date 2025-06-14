import { Texture, TextureLoader } from 'three';
import { Cache } from 'three';

// Enable texture caching
Cache.enabled = true;

// Global texture cache
const textureCache: { [key: string]: Texture } = {};

// List of all card images to preload
const CARD_IMAGES = [
  // Hearts
  "j_hearts",
  "q_hearts",
  "k_hearts",
  // Spades
  "j_spades",
  "q_spades",
  "k_spades",
  // Diamonds
  "j_diamonds",
  "q_diamonds",
  "k_diamonds",
  // Clubs
  "j_clubs",
  "q_clubs",
  "k_clubs"
];

// Function to get the image path
const getImagePath = (cardName: string, isReal: boolean = false): string => {
  return isReal ? `/cards/real/${cardName}.png` : `/cards/${cardName}.png`;
};

// Function to optimize image URL with Cloudflare parameters
const optimizeImageUrl = (url: string): string => {
  // Add Cloudflare image optimization parameters
  return `${url}?format=webp&quality=80&width=800`;
};

// Function to preload all card images
export const preloadCardImages = async (): Promise<void> => {
  const loader = new TextureLoader();
  const loadPromises: Promise<void>[] = [];

  // Load all card images
  CARD_IMAGES.forEach(cardName => {
    const imagePath = getImagePath(cardName);
    const optimizedUrl = optimizeImageUrl(imagePath);
    
    const loadPromise = new Promise<void>((resolve, reject) => {
      loader.load(
        optimizedUrl,
        (texture) => {
          // Optimize texture settings
          texture.anisotropy = 16;
          texture.needsUpdate = true;
          
          // Cache the texture
          textureCache[imagePath] = texture;
          resolve();
        },
        undefined,
        (error) => {
          console.warn(`Failed to load image: ${imagePath}`, error);
          reject(error);
        }
      );
    });

    loadPromises.push(loadPromise);
  });

  // Wait for all images to load
  await Promise.all(loadPromises);
};

// Function to get a cached texture
export const getCachedTexture = (cardName: string, isReal: boolean = false): Texture | null => {
  const imagePath = getImagePath(cardName, isReal);
  return textureCache[imagePath] || null;
};

// Function to check if all images are loaded
export const areAllImagesLoaded = (): boolean => {
  return CARD_IMAGES.every(cardName => {
    const imagePath = getImagePath(cardName);
    return !!textureCache[imagePath];
  });
};

// Function to get loading progress
export const getLoadingProgress = (): number => {
  const loadedCount = CARD_IMAGES.filter(cardName => {
    const imagePath = getImagePath(cardName);
    return !!textureCache[imagePath];
  }).length;
  
  return loadedCount / CARD_IMAGES.length;
}; 