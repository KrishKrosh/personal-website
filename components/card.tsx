"use client"

import { useRef, useState, useMemo, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { MeshStandardMaterial, DoubleSide, Vector3, Group, Shape, ExtrudeGeometry, 
         MeshBasicMaterial, Euler, Quaternion, Matrix4, TextureLoader, ShaderMaterial,
         PlaneGeometry, RingGeometry, Texture, Cache } from "three"
import { Text, useTexture } from "@react-three/drei"

// Enable texture caching to prevent redundant decoding
Cache.enabled = true;

// Global texture cache
const textureCache: { [key: string]: Texture } = {};

// Shared card back texture loader (singleton)
const getCardBackTexture = (() => {
  let texture: Texture | null = null;
  let loading = false;
  let listeners: ((texture: Texture | null) => void)[] = [];
  
  return (callback?: (texture: Texture | null) => void) => {
    // Return cached texture if available
    if (texture) {
      if (callback) callback(texture);
      return texture;
    }
    
    // Add callback to listeners
    if (callback) listeners.push(callback);
    
    // Start loading if not already in progress
    if (!loading) {
      loading = true;
      const loader = new TextureLoader();
      loader.load(
        "/images/card-back.png",
        (loadedTexture) => {
          texture = loadedTexture;
          
          // Apply texture optimization settings
          texture.anisotropy = 16;
          texture.needsUpdate = true;
          
          // Notify all listeners
          listeners.forEach(listener => listener(texture));
          listeners = [];
        },
        undefined,
        (error) => {
          console.warn("Card back texture failed to load:", error);
          // Notify listeners of failure
          listeners.forEach(listener => listener(null));
          listeners = [];
        }
      );
    }
    
    return null;
  };
})();

// Function to get shared texture for card faces
const getSharedTexture = (path: string): Texture | null => {
  if (textureCache[path]) {
    return textureCache[path];
  }
  
  // Start loading the texture
  const loader = new TextureLoader();
  loader.load(
    path,
    (loadedTexture) => {
      // Optimize texture
      loadedTexture.anisotropy = 16;
      loadedTexture.needsUpdate = true;
      // Cache the texture
      textureCache[path] = loadedTexture;
    }
  );
  
  return null;
};

// Card suits and values
const suits = ["♠", "♥", "♦", "♣"]
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]

// Define types for card properties
interface CardProps {
  card: {
    id: number;
    initialPosition: Vector3;
    rotation: number[];
    radius: number;
    speed: number;
    phase: number;
    axis: Vector3;
    scale: number;
    index?: number;  // Add index for position calculation
    totalCards?: number;  // Add total number of cards for positioning
  };
  hovered: boolean;
  expanded: boolean;
  isSelected?: boolean;
  allCardsSelected?: boolean;
  onSelect?: (cardId: number) => void;
}

// Create a rounded rectangle shape
const createRoundedRectShape = (width: number, height: number, radius: number) => {
  const shape = new Shape()
  
  // Start from top left, just after the rounded corner
  shape.moveTo(-width / 2 + radius, -height / 2)
  
  // Bottom side
  shape.lineTo(width / 2 - radius, -height / 2)
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius)
  
  // Right side
  shape.lineTo(width / 2, height / 2 - radius)
  shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2)
  
  // Top side
  shape.lineTo(-width / 2 + radius, height / 2)
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius)
  
  // Left side
  shape.lineTo(-width / 2, -height / 2 + radius)
  shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2)
  
  return shape
}

// Function to get the card image path based on value and suit
const getCardImagePath = (value: string, suit: string, isReal: boolean = false): string => {
  // Map to the correct filename format
  const valueMap: { [key: string]: string } = {
    "J": "j",
    "Q": "q",
    "K": "k"
  };
  
  const suitMap: { [key: string]: string } = {
    "♠": "spades",
    "♥": "hearts",
    "♦": "diamonds",
    "♣": "clubs"
  };
  
  // Use the mapped values if they exist, otherwise use the original value
  const mappedValue = valueMap[value] || value.toLowerCase();
  const mappedSuit = suitMap[suit];
  
  // Use the real photo folder if specified
  return isReal ? `/cards/real/${mappedValue}_${mappedSuit}.png` : `/cards/${mappedValue}_${mappedSuit}.png`;
}

// Function to check if a specific card image exists
// This matches the actual images available in the public/cards directory
const doesCardImageExist = (value: string, suit: string, isReal: boolean = false): boolean => {
  // List of available cards in the regular folder
  const availableIllustratedCards = [
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
  
  // List of available cards in the real photos folder
  const availableRealCards = [
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
    "k_diamonds",
    // Clubs
    "j_clubs",
    "k_clubs",
    "q_clubs"
  ];
  
  const valueMap: { [key: string]: string } = {
    // "A": "a", // No ace images found
    "J": "j",
    "Q": "q",
    "K": "k"
  };
  
  const suitMap: { [key: string]: string } = {
    "♠": "spades",
    "♥": "hearts",
    "♦": "diamonds",
    "♣": "clubs"
  };
  
  const mappedValue = valueMap[value] || value.toLowerCase();
  const mappedSuit = suitMap[suit];
  const cardKey = `${mappedValue}_${mappedSuit}`;
  
  // Check against the appropriate list based on whether we're looking for real or illustrated
  return isReal ? availableRealCards.includes(cardKey) : availableIllustratedCards.includes(cardKey);
}

export default function Card({ card, hovered, expanded, isSelected = false, allCardsSelected = false, onSelect }: CardProps) {
  const meshRef = useRef<Group>(null)
  const [suit] = useState(suits[Math.floor(card.id / 13)])
  const [value] = useState(values[card.id % 13])
  const [isRed] = useState(suit === "♥" || suit === "♦")
  const [isCardHovered, setIsCardHovered] = useState(false)
  const { pointer, viewport, camera, gl } = useThree()
  
  // State for real/illustrated toggle
  const [showRealPhoto, setShowRealPhoto] = useState(false)
  // State for transition animation
  const [transitionProgress, setTransitionProgress] = useState(0)
  
  // State for animation
  const [outlineIntensity, setOutlineIntensity] = useState(0)
  const [pulsePhase, setPulsePhase] = useState(Math.random() * Math.PI * 2)
  const [selectionProgress, setSelectionProgress] = useState(0)
  const [opacity, setOpacity] = useState(1)
  
  // Save the position and rotation at selection time
  const selectionState = useRef({
    position: new Vector3(),
    rotation: new Euler(),
    selected: false
  })
  
  // Animation state references to track previous values
  const prevStateRef = useRef({
    position: new Vector3(),
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1,
    time: 0
  })

  // Card dimensions
  const width = 1.4
  const height = 2
  const cornerRadius = 0.12
  const thickness = 0.01

  // Check if this card has a custom image available
  const hasCustomImage = useMemo(() => doesCardImageExist(value, suit), [value, suit]);
  
  // Check if this card has a real photo available
  const hasRealPhoto = useMemo(() => doesCardImageExist(value, suit, true), [value, suit]);
  
  // Get card image path - only if we know the image exists
  const cardImagePath = useMemo(() => {
    if (hasCustomImage) {
      return getCardImagePath(value, suit);
    }
    return "";
  }, [value, suit, hasCustomImage]);
  
  // Get real photo path - only if we know the image exists
  const realPhotoPath = useMemo(() => {
    if (hasRealPhoto) {
      return getCardImagePath(value, suit, true);
    }
    return "";
  }, [value, suit, hasRealPhoto]);
  
  // Only load texture if we know the image exists
  const cardTexture = hasCustomImage ? 
    (cardImagePath ? (textureCache[cardImagePath] || getSharedTexture(cardImagePath)) : null) : 
    null;
  
  const realPhotoTexture = hasRealPhoto ? 
    (realPhotoPath ? (textureCache[realPhotoPath] || getSharedTexture(realPhotoPath)) : null) : 
    null;
  
  // Card back texture with error handling
  const [cardBackTextureError, setCardBackTextureError] = useState(false);
  const [cardBackAspectRatio, setCardBackAspectRatio] = useState(1);
  const [loadedCardBackTexture, setLoadedCardBackTexture] = useState<Texture | null>(null);
  
  // Use the shared card back texture
  useEffect(() => {
    // Try to get texture from shared loader
    const texture = getCardBackTexture((texture) => {
      if (texture) {
        setLoadedCardBackTexture(texture);
        if (texture.image) {
          setCardBackAspectRatio(texture.image.width / texture.image.height);
        }
      } else {
        setCardBackTextureError(true);
      }
    });
    
    // If texture is already available, use it immediately
    if (texture) {
      setLoadedCardBackTexture(texture);
      if (texture.image) {
        setCardBackAspectRatio(texture.image.width / texture.image.height);
      }
    }
  }, []);
  
  // Create a custom shader material for the card back that will properly display the texture
  // while respecting rounded corners - similar to the card face material
  const cardBackMaterial = useMemo(() => {
    if (!loadedCardBackTexture || cardBackTextureError) return null;
    
    return new ShaderMaterial({
      uniforms: {
        map: { value: loadedCardBackTexture },
        cardSize: { value: new Vector3(width, height, 0) },
        cornerRadius: { value: cornerRadius },
        shineColor: { value: new Vector3(1.0, 0.843, 0.0) }, // Gold shine color in RGB
        shineOpacity: { value: 0.3 },
        borderWidth: { value: 0.05 },
        textureAspectRatio: { value: cardBackAspectRatio }
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform vec3 cardSize;
        uniform float cornerRadius;
        uniform vec3 shineColor;
        uniform float shineOpacity;
        uniform float borderWidth;
        uniform float textureAspectRatio;
        varying vec2 vUv;
        
        void main() {
          // Convert UV from 0-1 range to actual card dimensions
          vec2 cardPoint = vec2(
            (vUv.x - 0.5) * cardSize.x,
            (vUv.y - 0.5) * cardSize.y
          );
          
          // Calculate distance from corners for rounded corner effect
          float topRight = length(max(vec2(0.0), cardPoint - vec2(cardSize.x/2.0 - cornerRadius, cardSize.y/2.0 - cornerRadius)));
          float topLeft = length(max(vec2(0.0), vec2(-cardPoint.x, cardPoint.y) - vec2(cardSize.x/2.0 - cornerRadius, cardSize.y/2.0 - cornerRadius)));
          float bottomRight = length(max(vec2(0.0), vec2(cardPoint.x, -cardPoint.y) - vec2(cardSize.x/2.0 - cornerRadius, cardSize.y/2.0 - cornerRadius)));
          float bottomLeft = length(max(vec2(0.0), -cardPoint - vec2(cardSize.x/2.0 - cornerRadius, cardSize.y/2.0 - cornerRadius)));
          
          // Discard fragments outside the rounded rectangle
          if (topRight > cornerRadius || topLeft > cornerRadius || 
              bottomRight > cornerRadius || bottomLeft > cornerRadius) {
            discard;
          }
          
          // Adjust texture coordinates based on aspect ratio to fill the card without stretching
          vec2 adjustedUV = vUv;
          float cardAspectRatio = cardSize.x / cardSize.y;
          
          if (textureAspectRatio > cardAspectRatio) {
            // Image is wider than card - scale to match height
            float scale = cardAspectRatio / textureAspectRatio;
            adjustedUV.x = (vUv.x - 0.5) * scale + 0.5;
          } else {
            // Image is taller than card - scale to match width
            float scale = textureAspectRatio / cardAspectRatio;
            adjustedUV.y = (vUv.y - 0.5) * scale + 0.5;
          }
          
          // Sample the texture with adjusted coordinates
          vec4 texColor = texture2D(map, adjustedUV);
          
          // Calculate border effect
          float distFromEdgeX = min(vUv.x, 1.0 - vUv.x);
          float distFromEdgeY = min(vUv.y, 1.0 - vUv.y);
          float distFromEdge = min(distFromEdgeX, distFromEdgeY);
          
          // Create gold shimmer effect near the edges and for the border
          float borderFactor = smoothstep(0.0, borderWidth, distFromEdge);
          float shimmerIntensity = (1.0 - borderFactor) * shineOpacity;
          
          // Add subtle shine variation based on position
          float shine = shimmerIntensity * (0.8 + 0.2 * sin(vUv.x * 20.0) * sin(vUv.y * 20.0));
          
          // Mix the texture with the gold shine
          vec3 finalColor = mix(texColor.rgb, shineColor, shine);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: false,
      side: DoubleSide
    });
  }, [loadedCardBackTexture, cardBackTextureError, width, height, cornerRadius, cardBackAspectRatio]);

  // Image aspect ratio tracking
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const [realPhotoAspectRatio, setRealPhotoAspectRatio] = useState(1);

  // Update image aspect ratio once loaded
  useEffect(() => {
    if (cardTexture && cardTexture.image) {
      setImageAspectRatio(cardTexture.image.width / cardTexture.image.height);
      
      // Basic texture settings for better quality
      cardTexture.anisotropy = 16;
    }
    
    if (realPhotoTexture && realPhotoTexture.image) {
      setRealPhotoAspectRatio(realPhotoTexture.image.width / realPhotoTexture.image.height);
      
      // Basic texture settings for better quality
      realPhotoTexture.anisotropy = 16;
    }
  }, [cardTexture, realPhotoTexture]);
  
  // Update shader uniforms when aspect ratio changes
  useEffect(() => {
    if (cardBackMaterial && 'uniforms' in cardBackMaterial) {
      cardBackMaterial.uniforms.textureAspectRatio.value = cardBackAspectRatio;
    }
  }, [cardBackMaterial, cardBackAspectRatio]);
  
  // Reset to illustrated version when card is deselected
  useEffect(() => {
    if (!isSelected) {
      setShowRealPhoto(false);
      setTransitionProgress(0);
    }
  }, [isSelected]);
  
  // Create a custom shader material for the card face that will properly display the texture
  // while respecting rounded corners
  const cardFaceMaterial = useMemo(() => {
    if (!cardTexture) return null;
    
    return new ShaderMaterial({
      uniforms: {
        map: { value: cardTexture },
        map2: { value: realPhotoTexture }, // Add second texture
        transitionProgress: { value: transitionProgress }, // Add transition progress
        cardSize: { value: new Vector3(width, height, 0) },
        cornerRadius: { value: cornerRadius },
        imageAspectRatio: { value: cardTexture.image ? cardTexture.image.width / cardTexture.image.height : 1.0 },
        realPhotoAspectRatio: { value: realPhotoTexture?.image ? realPhotoTexture.image.width / realPhotoTexture.image.height : 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform sampler2D map2;
        uniform float transitionProgress;
        uniform vec3 cardSize;
        uniform float cornerRadius;
        uniform float imageAspectRatio;
        uniform float realPhotoAspectRatio;
        varying vec2 vUv;
        
        void main() {
          // Convert UV from 0-1 range to actual card dimensions
          vec2 cardPoint = vec2(
            (vUv.x - 0.5) * cardSize.x,
            (vUv.y - 0.5) * cardSize.y
          );
          
          // Use consistent corner radius throughout the transition
          float cardCornerRadius = cornerRadius;
          
          // Only apply rounded corners - removed the diminishing effect during transition
          float topRight = length(max(vec2(0.0), cardPoint - vec2(cardSize.x/2.0 - cardCornerRadius, cardSize.y/2.0 - cardCornerRadius)));
          float topLeft = length(max(vec2(0.0), vec2(-cardPoint.x, cardPoint.y) - vec2(cardSize.x/2.0 - cardCornerRadius, cardSize.y/2.0 - cardCornerRadius)));
          float bottomRight = length(max(vec2(0.0), vec2(cardPoint.x, -cardPoint.y) - vec2(cardSize.x/2.0 - cardCornerRadius, cardSize.y/2.0 - cardCornerRadius)));
          float bottomLeft = length(max(vec2(0.0), -cardPoint - vec2(cardSize.x/2.0 - cardCornerRadius, cardSize.y/2.0 - cardCornerRadius)));
          
          // Apply consistent corner clipping throughout the transition
          if (topRight > cardCornerRadius || topLeft > cardCornerRadius || 
              bottomRight > cardCornerRadius || bottomLeft > cardCornerRadius) {
            discard;
          }
          
          // Calculate adjusted UVs for the illustrated card
          vec2 adjustedUV = vUv;
          float cardAspectRatio = cardSize.x / cardSize.y;
          
          if (imageAspectRatio > cardAspectRatio) {
            // Image is wider than card - scale to match height
            float scale = cardAspectRatio / imageAspectRatio;
            adjustedUV.x = (vUv.x - 0.5) * scale + 0.5;
          } else {
            // Image is taller than card - scale to match width
            float scale = imageAspectRatio / cardAspectRatio;
            adjustedUV.y = (vUv.y - 0.5) * scale + 0.5;
          }
          
          // Calculate adjusted UVs for the real photo
          vec2 adjustedUV2 = vUv;
          if (realPhotoAspectRatio > cardAspectRatio) {
            // Real photo is wider than card - scale to match height
            float scale = cardAspectRatio / realPhotoAspectRatio;
            adjustedUV2.x = (vUv.x - 0.5) * scale + 0.5;
          } else {
            // Real photo is taller than card - scale to match width
            float scale = realPhotoAspectRatio / cardAspectRatio;
            adjustedUV2.y = (vUv.y - 0.5) * scale + 0.5;
          }
          
          // Sample both textures
          vec4 color1 = texture2D(map, adjustedUV);
          vec4 color2 = texture2D(map2, adjustedUV2);
          
          // Apply magical pixel dissolve transition effect
          float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
          float threshold = transitionProgress;
          float mixFactor = noise < threshold ? 1.0 : 0.0;
          
          // Blend between the two textures based on transition progress
          gl_FragColor = mix(color1, color2, mixFactor);
          
          // Add a glow/sparkle effect during transition
          if (transitionProgress > 0.0 && transitionProgress < 1.0) {
            float glowIntensity = sin(transitionProgress * 3.14159) * 0.2;
            float distFromThreshold = abs(noise - threshold);
            
            if (distFromThreshold < 0.05) {
              // Add sparkle along the transition edge
              float sparkle = glowIntensity * (1.0 - distFromThreshold / 0.05);
              gl_FragColor.rgb += vec3(sparkle, sparkle, sparkle);
            }
          }
        }
      `,
      transparent: true,
      side: DoubleSide
    });
  }, [cardTexture, realPhotoTexture, transitionProgress, width, height, cornerRadius]);

  // Create card geometry
  const cardGeometry = useMemo(() => {
    // Create the shape
    const shape = createRoundedRectShape(width, height, cornerRadius)
    
    // Extrude settings - keeping it simple
    const extrudeSettings = {
      steps: 1,
      depth: thickness,
      bevelEnabled: false
    }
    
    // Create geometry
    return new ExtrudeGeometry(shape, extrudeSettings)
  }, [])

  // Create card outline geometry for a slightly larger card
  const outlineGeometry = useMemo(() => {
    // Create a slightly larger shape for the outline
    const outlineShape = createRoundedRectShape(width + 0.04, height + 0.04, cornerRadius + 0.01)
    const outlineExtrudeSettings = {
      steps: 1,
      depth: thickness + 0.04,
      bevelEnabled: false
    }
    return new ExtrudeGeometry(outlineShape, outlineExtrudeSettings)
  }, [])

  // Add these state variables to track tilt targets and current values
  const [currentTilt, setCurrentTilt] = useState({ x: 0, y: 0 });
  const [targetTilt, setTargetTilt] = useState({ x: 0, y: 0 });

  // State for card positioning and screen size
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  
  // Update screen size state
  useEffect(() => {
    const updateScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640);
    };
    
    // Set initial size
    updateScreenSize();
    
    // Add resize listener
    window.addEventListener('resize', updateScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Keep track of when card becomes selected
  useEffect(() => {
    if (isSelected && !selectionState.current.selected && meshRef.current) {
      // Store position and rotation at selection time
      selectionState.current.position.copy(meshRef.current.position)
      selectionState.current.rotation.copy(meshRef.current.rotation)
      selectionState.current.selected = true
      
      // Store the exact world position and rotation at selection time
      // This ensures we animate from the exact position where the card was clicked
      if (meshRef.current.parent) {
        // Get world position by applying parent transformations
        const worldPosition = new Vector3();
        meshRef.current.getWorldPosition(worldPosition);
        selectionState.current.position.copy(worldPosition);
        
        // Get world rotation
        const worldQuaternion = new Quaternion();
        meshRef.current.getWorldQuaternion(worldQuaternion);
        const worldEuler = new Euler().setFromQuaternion(worldQuaternion);
        selectionState.current.rotation.copy(worldEuler);
      }
    } else if (!isSelected) {
      selectionState.current.selected = false
    }
  }, [isSelected])

  // Calculate tilt based on pointer position (for selected card)
  const calculateTilt = () => {
    // Only calculate target tilt if the card is selected
    if (!isSelected) return { x: 0, y: 0 };
    
    // Convert pointer coordinates to normalized values (-1 to 1)
    const x = (pointer.x * viewport.width) / 2;
    const y = (pointer.y * viewport.height) / 2;
    
    // Check if the cursor is over the card using raycasting
    const isPointerOverCard = document.body.classList.contains('clickable');
    
    if (!isPointerOverCard) {
      // When cursor is not over the card, set target tilt to zero (flat)
      setTargetTilt({ x: 0, y: 0 });
      return { x: 0, y: 0 };
    }
    
    // Calculate tilt angles (limit to small values for subtle effect)
    const newTilt = {
      x: y * 0.1, // Tilt around X axis based on Y position
      y: x * 0.1, // Tilt around Y axis based on X position
    };
    
    // Update the target tilt that we'll smoothly move toward
    setTargetTilt(newTilt);
    return newTilt;
  }

  // Calculate position using Fibonacci sphere algorithm
  const calculateFibonacciSpherePosition = (index: number, total: number, radius: number, time: number) => {
    // Golden ratio approximation
    const phi = Math.PI * (3 - Math.sqrt(5));
    
    // Get y position (latitude)
    const y = 1 - (index / (total - 1)) * 2;
    
    // Calculate radius at this latitude
    const latRadius = Math.sqrt(1 - y * y);
    
    // Calculate longitude with time-based rotation
    // Add a small time factor for global rotation, but keep the Fibonacci distribution
    const longitude = phi * index + time * card.speed * 0.2;
    
    // Add slight wobble to each card's position to create more organic movement
    const wobble = Math.sin(time * 0.5 + card.phase) * 0.1;
    
    // Calculate position with adjusted radius to account for card dimensions
    // Width and height of card need to be considered to prevent intersections
    const cardSpacingFactor = 1.3; // Factor to account for card dimensions
    const adjustedRadius = radius * cardSpacingFactor;
    
    const x = Math.cos(longitude) * latRadius * adjustedRadius;
    const z = Math.sin(longitude) * latRadius * adjustedRadius;
    const adjustedY = y * adjustedRadius * 0.6 + wobble;
    
    return { x, y: adjustedY, z };
  }

  // Calculate position when expanded but not selected
  const calculateExpandedPosition = (index: number, numCards: number, time: number) => {
    if (isSelected) {
      // If selected, position the card at center-left area
      if (isSmallScreen) {
        // On small screens, position the card centered and higher up
        return {
          x: 0,
          y: 1.5, // Lowered card position (was 2)
          z: 0.5,
          rotX: 0,
          rotY: Math.PI * 0.1, // Slight turn for 3D effect
          rotZ: 0
        };
      } else {
        // On larger screens, position the card on the left
        return {
          x: -1.5, // Moved slightly closer to center (was -2.5)
          y: 0,    // Centered vertically
          z: 0.5,  // Slightly forward
          rotX: 0,
          rotY: Math.PI * 0.1, // Slight turn for 3D effect
          rotZ: 0
        };
      }
    } else if (allCardsSelected) {
      // Other cards should be hidden when one is selected
      return {
        x: 0,
        y: -1000, // Move way off screen
        z: 0,
        rotX: 0,
        rotY: 0,
        rotZ: 0
      };
    } else {
      // Default position for expanded cards in the globe pattern
      // This code uses the Fibonacci sphere algorithm from above
      const position = calculateFibonacciSpherePosition(index, numCards, card.radius, time);
      return {
        x: position.x,
        y: position.y,
        z: position.z,
        rotX: card.axis.x * time * 0.1,
        rotY: card.axis.y * time * 0.1,
        rotZ: card.axis.z * time * 0.1
      };
    }
  }

  useFrame((state, delta) => {
    if (!meshRef.current) return

    const { initialPosition, radius, speed, phase, axis, scale } = card
    const time = state.clock.getElapsedTime()
    
    // Use delta time to ensure smooth animations regardless of frame rate
    const frameFactor = Math.min(delta * 60, 2) // Cap at a reasonable value to prevent huge jumps
    
    // Store current position for smooth transitions
    const currentPosition = meshRef.current.position.clone()
    let targetPosition = new Vector3()
    let targetScale = scale
    let targetRotation = new Euler()

    // Update selection progress
    if (isSelected) {
      setSelectionProgress(prev => Math.min(prev + 0.05 * frameFactor, 1))
    } else {
      setSelectionProgress(prev => Math.max(prev - 0.05 * frameFactor, 0))
    }

    // Calculate tilt and update targets
    calculateTilt();
    
    // Smoothly interpolate current tilt toward target tilt
    const tiltLerpFactor = 0.1 * frameFactor; // Adjust this value to control tilt speed
    setCurrentTilt(prev => ({
      x: prev.x + (targetTilt.x - prev.x) * tiltLerpFactor,
      y: prev.y + (targetTilt.y - prev.y) * tiltLerpFactor
    }));

    // Handle transition animation
    if (showRealPhoto && transitionProgress < 1) {
      setTransitionProgress(prev => Math.min(prev + 0.015 * frameFactor, 1));
    } else if (!showRealPhoto && transitionProgress > 0) {
      setTransitionProgress(prev => Math.max(prev - 0.015 * frameFactor, 0));
    }
    
    // Update shader uniform if material exists
    if (cardFaceMaterial && 'uniforms' in cardFaceMaterial) {
      cardFaceMaterial.uniforms.transitionProgress.value = transitionProgress;
    }

    if (isSelected) {
      // Position the selected card differently based on screen size
      // Use the calculateExpandedPosition function to ensure consistency
      const expandedPos = calculateExpandedPosition(0, 0, time);
      targetPosition.set(expandedPos.x, expandedPos.y, expandedPos.z);
      
      // For direct camera facing, ensure zero rotation as the base
      targetRotation.set(0, 0, 0)
      
      // Reset any accumulated rotation first
      if (selectionProgress >= 0.95 && meshRef.current) {
        // Reset to zero rotation first to eliminate any accumulated z-rotation
        meshRef.current.rotation.set(0, 0, 0)
        
        // Then apply smoothly interpolated tilt values for interactive effect
        meshRef.current.rotation.x = currentTilt.x
        meshRef.current.rotation.y = currentTilt.y + Math.PI * 0.1 // Add slight rotation for 3D effect
        meshRef.current.rotation.z = 0
      } else if (selectionProgress < 0.95) {
        // During transition, interpolate towards the target rotation
        const progress = selectionProgress
        
        // Create quaternions for smooth rotation interpolation
        const startQuaternion = new Quaternion().setFromEuler(selectionState.current.rotation)
        const endQuaternion = new Quaternion().setFromEuler(new Euler(0, Math.PI * 0.1, 0))
        
        // Interpolate between the start and end rotations
        const interpolatedQuaternion = new Quaternion()
        interpolatedQuaternion.slerpQuaternions(startQuaternion, endQuaternion, progress)
        
        // Apply the interpolated rotation
        meshRef.current.quaternion.copy(interpolatedQuaternion)
        
        // During selection transition, also interpolate position from the exact selection position
        if (selectionProgress < 0.8) {
          // Create a temporary vector for interpolation
          const tempPosition = new Vector3();
          
          // Interpolate between the stored selection position and the target position
          tempPosition.lerpVectors(
            selectionState.current.position,
            targetPosition,
            selectionProgress / 0.8 // Normalize progress to complete by 80% of the transition
          );
          
          // Apply the interpolated position directly
          meshRef.current.position.copy(tempPosition);
        }
      }
      
      // Larger scale for the selected card - increased for better visibility
      targetScale = 1.75
      
      // No outline for selected cards
      setOutlineIntensity(0)
    } else if (!hovered) {
      // Initial stacked position with backs facing the user
      targetPosition.copy(initialPosition)
      meshRef.current.rotation.set(Math.PI/-4, Math.PI, Math.PI * 0.75)
      targetScale = 1
      
      // Smooth transition to zero outline
      setOutlineIntensity(outlineIntensity => outlineIntensity * 0.9)
    } else if (!expanded) {
      // Fly outwards animation - smooth progress calculation
      const progress = Math.min((time - prevStateRef.current.time + 1) * 0.5, 1)
      targetPosition = initialPosition.clone().multiplyScalar(1 + progress * 10)
      
      // Direct rotation application with frame-rate independence
      meshRef.current.rotation.x += 0.01 * frameFactor
      meshRef.current.rotation.y += 0.01 * frameFactor
      meshRef.current.rotation.z += 0.01 * frameFactor
      
      targetScale = 1
      
      // Smooth transition to zero outline
      setOutlineIntensity(outlineIntensity => outlineIntensity * 0.9)
    } else {
      // Use Fibonacci sphere algorithm to calculate position
      const index = card.index || card.id;
      const totalCards = card.totalCards || 15; // Default to 15 if not provided
      
      // Calculate position using even distribution algorithm
      const position = calculateFibonacciSpherePosition(index, totalCards, radius, time);
      
      if (isCardHovered) {
        // Move hovered card slightly outward for emphasis
        const hoverDirection = new Vector3(position.x, position.y, position.z).normalize()
        targetPosition = new Vector3(
          position.x + hoverDirection.x * 0.5,
          position.y + hoverDirection.y * 0.5,
          position.z + hoverDirection.z * 0.5
        )
        
        // Smooth scale animation on hover
        const hoverScale = scale * (1.2 + Math.sin(time * 3 + pulsePhase) * 0.05)
        targetScale = hoverScale
        
        // Animate outline intensity with a subtle pulsing effect
        const targetOutline = 0.9 + Math.sin(time * 2) * 0.1
        setOutlineIntensity(intensity => intensity + (targetOutline - intensity) * 0.05)
      } else {
        // Standard position for non-hovered cards
        targetPosition.set(position.x, position.y, position.z)
        targetScale = scale
        
        // Fade out outline when not hovered
        setOutlineIntensity(intensity => intensity > 0.01 ? intensity * 0.9 : 0)
      }

      // Direct rotation application with frame-rate independence
      // This preserves the unique rotation of each card based on its axis
      if (!isCardHovered) {
        meshRef.current.rotation.x += axis.x * 0.01 * frameFactor
        meshRef.current.rotation.y += axis.y * 0.01 * frameFactor
        meshRef.current.rotation.z += axis.z * 0.01 * frameFactor
      }
    }

    // Apply smooth position transitions
    const positionLerpFactor = isSelected ? 0.08 * frameFactor : 0.06 * frameFactor
    meshRef.current.position.lerp(targetPosition, positionLerpFactor)
    
    // Apply smooth scale transition
    const currentScale = meshRef.current.scale.x
    const newScale = currentScale + (targetScale - currentScale) * 0.08 * frameFactor
    meshRef.current.scale.set(newScale, newScale, newScale)
    
    // Store current state for next frame
    prevStateRef.current = {
      position: meshRef.current.position.clone(),
      rotation: {
        x: meshRef.current.rotation.x,
        y: meshRef.current.rotation.y,
        z: meshRef.current.rotation.z
      },
      scale: meshRef.current.scale.x,
      time: time
    }
  })
  
  // Font sizes and positions based on card value
  const valueFontSize = value === "10" ? 0.18 : 0.2
  const cornerPosition = value === "10" ? 0.52 : 0.55
  
  // Card interaction handlers
  const handlePointerOver = () => {
    // Only enable hover effects if the card is in expanded state but not selected
    if (expanded && !isSelected) {
      setIsCardHovered(true)
      // Use a CSS class instead of directly setting the cursor style
      document.body.classList.add('clickable')
    } else if (isSelected) {
      // Still change cursor for selected card, but don't activate hover effects
      document.body.classList.add('clickable')
    }
  }
  
  const handlePointerOut = () => {
    setIsCardHovered(false)
    // Remove the CSS class when not hovering
    document.body.classList.remove('clickable')
  }
  
  const handleClick = (e: React.MouseEvent) => {
    // Add a special flag to the event to identify it as a card click
    if (e) {
      e.stopPropagation();
      // Set a custom property to identify this as a direct card click
      // @ts-ignore - we're adding a custom property
      e.cardClick = true;
    }
    
    // If the card is already selected, toggle between illustrated and real versions
    if (isSelected && hasRealPhoto) {
      setShowRealPhoto(prev => !prev);
      return;
    }
    
    // Otherwise handle selection/deselection as before
    if ((expanded && isCardHovered) || isSelected) {
      if (onSelect) {
        onSelect(card.id)
      }
    }
  }

  // Add event listener for clicks outside card to go back to exploded view
  useEffect(() => {
    // Only add listener when a card is selected
    if (!isSelected) return;
    
    // Get the canvas element from the renderer
    const canvasElement = gl.domElement;

    const handleGlobalClick = (e: MouseEvent) => {
      // 1. Ignore clicks that originated directly from the card's onClick handler
      // @ts-ignore - checking for our custom property
      if (e.cardClick === true) {
        return;
      }
      
      // Deselect the card when clicking anywhere except on the card itself
      if (onSelect) {
        // Check if this is a click directly on a THREE.js object (the card)
        // If not, it's a click on empty space and we should deselect
        const rect = canvasElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        // If the pointer is not over any 3D object when clicked (empty space),
        // or if the click is outside the canvas, deselect the card
        const isClickOutsideCanvas = !canvasElement.contains(e.target as Node);
        const isClickOnEmptySpace = !isCardHovered;
        
        if (isClickOutsideCanvas || isClickOnEmptySpace) {
          onSelect(card.id);
        }
      }
    };
    
    // Add listener
    window.addEventListener('click', handleGlobalClick);
    
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [isSelected, onSelect, card.id, isCardHovered]);

  // Shared texture loading for use with drei's useTexture
  useEffect(() => {
    // Pre-load textures for face cards to prevent lag during view transitions
    if (hasCustomImage && cardImagePath) {
      // Add to texture cache if not already present
      if (!textureCache[cardImagePath]) {
        useTexture.preload(cardImagePath);
      }
    }
    
    if (hasRealPhoto && realPhotoPath) {
      // Add to texture cache if not already present
      if (!textureCache[realPhotoPath]) {
        useTexture.preload(realPhotoPath);
      }
    }
  }, [hasCustomImage, cardImagePath, hasRealPhoto, realPhotoPath]);

  // Optimization for rendering cards that are not visible
  // Only render detailed cards when they're visible
  const isVisible = expanded || isSelected || (allCardsSelected && isSelected);
  const isOffScreen = !isVisible && allCardsSelected;
  
  // Skip rendering cards that are definitely off-screen
  if (isOffScreen && !isSelected) {
    return null;
  }

  return (
    <group 
      ref={meshRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      onPointerDown={(e) => {
        // This helps with mobile touch interactions
        e.stopPropagation();
        if (expanded) {
          setIsCardHovered(true);
        }
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        // We no longer need to call handleClick here,
        // onClick handles both desktop and mobile reliably.
      }}
    >
      {/* Outline effect - only show for expanded cards that are hovered, never for selected cards */}
      {expanded && !isSelected && isCardHovered && outlineIntensity > 0 && (
        <mesh geometry={outlineGeometry} renderOrder={-1}>
          <meshBasicMaterial 
            color="#dbb960" 
            opacity={outlineIntensity * 0.4}
            transparent={true}
            depthWrite={false}
            depthTest={true}
            side={DoubleSide}
          />
        </mesh>
      )}

      {/* Card face - use white for the base */}
      <mesh geometry={cardGeometry} renderOrder={0}>
        <meshStandardMaterial 
          color="#ffffff" 
          roughness={0.2} 
          metalness={0.1}
          side={DoubleSide}
        />
      </mesh>

      {/* Card face content - either textured image or standard text */}
      <group position={[0, 0, thickness + 0.001]} renderOrder={2}>
        {/* Use the custom texture for the card face if available */}
        {(hasCustomImage && cardTexture && cardFaceMaterial) ? (
          // Use a standard plane with our custom shader material
          <mesh>
            <planeGeometry args={[
              // Maintain the original size throughout transition instead of interpolating
              width - 0.01, 
              height - 0.01
            ]} />
            <primitive object={cardFaceMaterial} attach="material" />
          </mesh>
        ) : (
          // Fallback to the original text-based card face
          <>
            {/* Center symbol - larger for non-numeric cards */}
            <Text
              position={[0, 0, 0]}
              fontSize={value === "A" || value === "J" || value === "Q" || value === "K" ? 0.8 : 0.6}
              color={isRed ? "#cc0000" : "#000000"}
              anchorX="center"
              anchorY="middle"
            >
              {value === "A" ? suit :
              value === "J" ? "J" :
              value === "Q" ? "Q" :
              value === "K" ? "K" : 
              suit}
            </Text>

            {/* Top left value and suit */}
            <Text
              position={[-cornerPosition, 0.85, 0]}
              fontSize={valueFontSize}
              color={isRed ? "#cc0000" : "#000000"}
              anchorX="center"
              anchorY="middle"
            >
              {value}
            </Text>
            <Text
              position={[-cornerPosition, 0.65, 0]}
              fontSize={0.2}
              color={isRed ? "#cc0000" : "#000000"}
              anchorX="center"
              anchorY="middle"
            >
              {suit}
            </Text>

            {/* Bottom right value and suit (upside down) */}
            <Text
              position={[cornerPosition, -0.85, 0]}
              fontSize={valueFontSize}
              color={isRed ? "#cc0000" : "#000000"}
              anchorX="center"
              anchorY="middle"
              rotation={[0, 0, Math.PI]}
            >
              {value}
            </Text>
            <Text
              position={[cornerPosition, -0.65, 0]}
              fontSize={0.2}
              color={isRed ? "#cc0000" : "#000000"}
              anchorX="center"
              anchorY="middle"
              rotation={[0, 0, Math.PI]}
            >
              {suit}
            </Text>
          </>
        )}
      </group>

      {/* Card back design - intricate */}
      <group position={[0, 0, -thickness / 2 - 0.001]} rotation={[Math.PI, 0, 0]} renderOrder={1}>
        {/* Card back with proper texture and rounded corners */}
        <mesh>
          <planeGeometry args={[width, height]} />
          {cardBackMaterial ? (
            <primitive object={cardBackMaterial} attach="material" />
          ) : (
            // Fallback if texture isn't loaded - create a nice patterned back
            <meshStandardMaterial 
              color="#c09000" 
              metalness={0.8} 
              roughness={0.2} 
              side={DoubleSide}
            />
          )}
        </mesh>
        
        {/* Fallback decorative elements when no texture is available */}
        {!cardBackMaterial && (
          <>
            {/* Inner border */}
            <mesh position={[0, 0, 0.001]}>
              <planeGeometry args={[width - 0.15, height - 0.15]} />
              <meshStandardMaterial 
                color="#ffd700" 
                metalness={0.9} 
                roughness={0.1} 
                side={DoubleSide}
              />
            </mesh>
            
            {/* Center ornament */}
            <group position={[0, 0, 0.002]}>
              <mesh>
                <circleGeometry args={[0.4, 32]} />
                <meshStandardMaterial 
                  color="#c09000" 
                  metalness={0.8} 
                  roughness={0.2} 
                  side={DoubleSide}
                />
              </mesh>
              
              {/* Suits in the center */}
              {suits.map((suit, index) => (
                <group 
                  key={index}
                  position={[
                    Math.cos(index * Math.PI / 2) * 0.2,
                    Math.sin(index * Math.PI / 2) * 0.2,
                    0.001
                  ]}
                >
                  <Text
                    fontSize={0.15}
                    color="#ffd700"
                    anchorX="center"
                    anchorY="middle"
                  >
                    {suit}
                  </Text>
                </group>
              ))}
            </group>
          </>
        )}
      </group>

      {/* Replace the toggle button with an instructional label */}
      {isSelected && hasRealPhoto && (
        <group 
          position={[0, -1.05, 0.1]} 
          scale={0.3}
        >
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.14}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            font={undefined}
            material-transparent={true}
            material-opacity={0.7}
          >
            {showRealPhoto ? "click card for illustration" : "click card for original"}
          </Text>
        </group>
      )}
    </group>
  )
}
