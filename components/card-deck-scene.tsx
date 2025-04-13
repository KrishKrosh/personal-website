"use client"

import { useRef, useState, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Environment, OrbitControls, Plane, useTexture } from "@react-three/drei"
import { Group, Camera, Vector3, Color, MeshStandardMaterial, ShaderMaterial } from "three"
import CardDeck from "./card-deck"
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

// Background component with subtle animation
function MysticBackground({ pauseAnimations }: { pauseAnimations: boolean }) {
  const materialRef = useRef<ShaderMaterial>(null!)
  
  // Create a custom shader for the background
  const uniforms = {
    time: { value: 0 },
    color1: { value: new Color("#0f0a1a") }, // Deep purple/blue
    color2: { value: new Color("#292037") }, // Lighter purple
    color3: { value: new Color("#1e1525") }, // Mid-tone
  }
  
  // Animate the shader
  useFrame((state) => {
    if (materialRef.current && !pauseAnimations) {
      materialRef.current.uniforms.time.value = state.clock.getElapsedTime() * 0.05
    }
  })
  
  return (
    // Make the plane much larger to ensure it always fills the view
    <Plane args={[100, 100]} position={[0, 0, -10]}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float time;
          uniform vec3 color1;
          uniform vec3 color2;
          uniform vec3 color3;
          varying vec2 vUv;
          
          void main() {
            // Create a subtle gradient that completely fills the view
            vec3 baseColor = mix(color1, color2, smoothstep(0.2, 0.8, vUv.y + sin(vUv.x * 1.5 + time) * 0.08));
            
            // Add a subtle dark "eclipse" circle with limited movement
            // Reduced movement range to keep it within visible area
            float dist = length(vUv - vec2(0.5 + sin(time * 0.15) * 0.03, 0.5 + cos(time * 0.1) * 0.03));
            baseColor = mix(baseColor, color3, smoothstep(0.2, 0.19, dist) * 0.7);
            
            // Add a subtle glow around the eclipse
            baseColor += vec3(0.05, 0.02, 0.08) * smoothstep(0.3, 0.2, dist) * smoothstep(0.1, 0.2, dist);
            
            // Removed the stars/noise effect as requested
            
            gl_FragColor = vec4(baseColor, 1.0);
          }
        `}
      />
    </Plane>
  )
}

// Subtle light rays component
function LightRays({ pauseAnimations }: { pauseAnimations: boolean }) {
  const rayRef = useRef<ShaderMaterial>(null!)
  
  const uniforms = {
    time: { value: 0 },
    opacity: { value: 0.05 }, // Even more subtle
  }
  
  useFrame((state) => {
    if (rayRef.current && !pauseAnimations) {
      rayRef.current.uniforms.time.value = state.clock.getElapsedTime() * 0.01 // Slower movement
    }
  })
  
  return (
    <Plane args={[100, 100]} position={[0, 0, -9]}>
      <shaderMaterial
        ref={rayRef}
        transparent={true}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float time;
          uniform float opacity;
          varying vec2 vUv;
          
          void main() {
            vec2 center = vec2(0.5, 0.5);
            vec2 dir = vUv - center;
            float dist = length(dir);
            
            // Create light rays emanating from center - fewer rays
            float angle = atan(dir.y, dir.x);
            float ray = sin(angle * 6.0 + time) * 0.5 + 0.5;
            
            // Fade rays based on distance - more concentrated in center
            float alpha = ray * smoothstep(0.7, 0.0, dist) * opacity;
            
            gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
          }
        `}
      />
    </Plane>
  )
}

// Camera-following background that stays fixed relative to the camera view
function CameraBackground({ pauseAnimations }: { pauseAnimations: boolean }) {
  const { camera } = useThree()
  const groupRef = useRef<Group>(null!)
  
  // Keep the background aligned with the camera
  useFrame(() => {
    if (groupRef.current && !pauseAnimations) {
      // Position the group in front of the camera at a fixed distance
      groupRef.current.position.copy(camera.position)
      groupRef.current.position.z -= 15 // Background distance
      
      // Look at where the camera is looking
      groupRef.current.lookAt(camera.position.clone().add(camera.getWorldDirection(new Vector3())))
    }
  })
  
  return (
    <group ref={groupRef}>
      <MysticBackground pauseAnimations={pauseAnimations} />
      <LightRays pauseAnimations={pauseAnimations} />
    </group>
  )
}

// MysticalText component that displays flowing text in the bottom middle of the page
function MysticalText() {
  const [textLines, setTextLines] = useState<string[]>([])
  const [textProgress, setTextProgress] = useState<number[]>([])
  const [allowInteraction, setAllowInteraction] = useState<boolean>(false)
  const [shouldDisplay, setShouldDisplay] = useState<boolean>(true)
  const [fadeOut, setFadeOut] = useState<boolean>(false)
  const [showOnlyLastLine, setShowOnlyLastLine] = useState<boolean>(false)
  
  // Lines to display in sequence
  const narrativeLines = [
    "Nice to meet you. I'm Krish.",
    "One fun fact about me is that I like magic.",
    "So go ahead. Pick a card. Any card."
  ]
  
  // Start the text animation sequence after a short delay
  useEffect(() => {
    const startTextAnimation = setTimeout(() => {
      showNextLine(0)
    }, 800) // Slightly longer delay to ensure everything is loaded properly
    
    return () => clearTimeout(startTextAnimation)
  }, [])
  
  // Function to show the next line with proper timing
  const showNextLine = (lineIndex: number) => {
    if (lineIndex >= narrativeLines.length) return
    
    // Add the line to the array with initial progress of 0 (no characters shown)
    setTextLines(prev => {
      const newLines = [...prev]
      newLines[lineIndex] = narrativeLines[lineIndex]
      return newLines
    })
    
    setTextProgress(prev => {
      const newProgress = [...prev]
      newProgress[lineIndex] = 0
      return newProgress
    })
    
    // Start the character-by-character reveal animation
    animateTextReveal(lineIndex, 0)
  }
  
  // Animate the revealing of text characters
  const animateTextReveal = (lineIndex: number, charIndex: number) => {
    const currentLine = narrativeLines[lineIndex]
    
    if (charIndex >= currentLine.length) {
      // We've completed the current line
      const isLastLine = lineIndex === narrativeLines.length - 1
      
      if (isLastLine) {
        // Enable card interaction after the last line
        setTimeout(() => {
          setAllowInteraction(true)
        }, 800)
      } else {
        // Show the next line after a delay
        setTimeout(() => {
          showNextLine(lineIndex + 1)
        }, 1200)
      }
      return
    }
    
    // Update the progress for this line
    setTextProgress(prev => {
      const newProgress = [...prev]
      newProgress[lineIndex] = (charIndex + 1) / currentLine.length
      return newProgress
    })
    
    // Determine next character delay based on punctuation
    let nextCharDelay = 30 // Base delay between characters
    
    // Check for different punctuation marks
    if (currentLine[charIndex] === '.') {
      nextCharDelay = 450 // Longer pause after periods
    } else if (currentLine[charIndex] === ',') {
      nextCharDelay = 200 // Medium pause after commas
    } else if (currentLine[charIndex] === ' ') {
      nextCharDelay = 50 // Slight pause after spaces
    }
    
    // Schedule the next character
    setTimeout(() => {
      animateTextReveal(lineIndex, charIndex + 1)
    }, nextCharDelay)
  }
  
  // Create a function to handle the fade out with promise
  const fadeOutAndHide = () => {
    return new Promise<void>((resolve) => {
      setFadeOut(true)
      setTimeout(() => {
        setShouldDisplay(false)
        resolve()
      }, 600) // Match the transition duration
    })
  }
  
  // Function to show only the last line
  const showOnlyPickCardLine = () => {
    setShowOnlyLastLine(true)
  }
  
  // Render the mystical text with flowing animation
  return {
    mysticalTextContent: shouldDisplay ? (
      <div className={`absolute bottom-12 left-0 right-0 flex flex-col items-center z-10 pointer-events-none mystical-text-wrapper ${fadeOut ? 'fade-out' : ''}`}>
        {textLines.map((line, lineIndex) => {
          // When cards explode, only show the last line
          if (showOnlyLastLine && lineIndex < narrativeLines.length - 1) {
            return null;
          }
          
          return (
            <div key={lineIndex} className="mystical-text-container">
              {/* Render each character with its own fade-in animation */}
              {Array.from(line).map((char, charIndex) => {
                // Calculate if this character should be visible based on progress
                const charProgress = (charIndex + 1) / line.length
                const isVisible = textProgress[lineIndex] >= charProgress
                
                return (
                  <span 
                    key={`${lineIndex}-${charIndex}`} 
                    className={`mystical-char ${isVisible ? 'visible' : ''}`}
                    style={{
                      // Slight progressive delay based on character position for flowing effect
                      transitionDelay: `${charIndex * 20}ms`
                    }}
                  >
                    {char}
                  </span>
                )
              })}
            </div>
          );
        })}
      </div>
    ) : null,
    allowInteraction,
    fadeOutAndHide,
    showOnlyPickCardLine
  }
}

export default function CardDeckScene() {
  const [hovered, setHovered] = useState<boolean>(false)
  const [expanded, setExpanded] = useState<boolean>(false)
  const [contextLost, setContextLost] = useState<boolean>(false)
  const [cardSelected, setCardSelected] = useState<boolean>(false)
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null)
  const [cursorPosition, setCursorPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
  const [panelFadeIn, setPanelFadeIn] = useState<boolean>(false)
  
  // State for character-by-character animation
  const [titleProgress, setTitleProgress] = useState<number>(0)
  const [paragraph1Progress, setParagraph1Progress] = useState<number>(0)
  const [paragraph2Progress, setParagraph2Progress] = useState<number>(0)
  const [paragraph3Progress, setParagraph3Progress] = useState<number>(0)
  const [paragraph4Progress, setParagraph4Progress] = useState<number>(0)
  const [paragraph5Progress, setParagraph5Progress] = useState<number>(0)
  const [linkProgress, setLinkProgress] = useState<number>(0)
  
  // Reference to the canvas container
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Get mystical text and interaction permission
  const { mysticalTextContent, allowInteraction, fadeOutAndHide, showOnlyPickCardLine } = MysticalText()

  // Function to get user's location non-invasively using ipwhois.io
  const getUserLocation = async (): Promise<string> => {
    try {
      // Try to get location from IP using ipwhois.io (free tier, no API key needed)
      const response = await fetch('https://ipwho.is/');
      const data = await response.json();
      
      if (data.success && data.city) {
        return data.city;
      } else if (data.success && data.country) {
        return data.country;
      }
    } catch (error) {
      console.error('Error getting location from IP:', error);
      
      // Fallback to timezone method if IP geolocation fails
      try {
        // Get timezone and infer a general location from it
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Extract city from timezone (e.g., "America/New_York" -> "New York")
        if (timezone && timezone.includes('/')) {
          const city = timezone.split('/').pop()?.replace(/_/g, ' ');
          return city || 'a mysterious place';
        }
      } catch (tzError) {
        console.error('Error getting timezone:', tzError);
      }
    }
    
    return 'a mysterious place'; // Fallback
  }

  // Get user location
  const [userLocation, setUserLocation] = useState<string>('a mysterious place');
  
  // Get user location on component mount
  useEffect(() => {
    getUserLocation().then(location => setUserLocation(location));
  }, []);

  // Handle mouse movement over the canvas
  const handlePointerMove = (event: React.PointerEvent): void => {
    if (containerRef.current) {
      // Get the container's bounding rectangle
      const rect = containerRef.current.getBoundingClientRect()
      
      // Calculate normalized coordinates (from -1 to 1) for the cursor position
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      // Update cursor position state
      setCursorPosition({ x, y })
      
      // Calculate distance from cursor to the center (where the card deck is)
      // The card deck is positioned at (0,0,0) in the scene
      const distance = Math.sqrt(x * x + y * y)
      
      // Only trigger hover when cursor is within a reasonable distance of the card deck
      // AND when interaction is allowed (after the final text line)
      const hoverDistance = 0.5
      
      if (distance < hoverDistance && !hovered && allowInteraction) {
        setHovered(true)

        // After a delay, trigger the expanded state
        setTimeout(() => {
          setExpanded(true)
          // When cards explode, show only the last line
          showOnlyPickCardLine()
        }, 1500)
      }
    }
  }

  // Handle WebGL context loss
  const handleContextLost = (event: Event): void => {
    console.warn("WebGL context lost - attempting to recover")
    setContextLost(true)
    
    // Try to recover after a short delay
    setTimeout(() => {
      setContextLost(false)
    }, 2000)
  }

  // Generic function to animate text character by character with better completion tracking
  const animateText = (text: string, setProgress: (progress: number) => void, onComplete?: () => void) => {
    let charIndex = 0;
    let isComplete = false;
    let animationTimer: NodeJS.Timeout | null = null;
    
    // Reset progress at the start
    setProgress(0);
    
    const animate = () => {
      if (isComplete) return;
      
      if (charIndex >= text.length) {
        isComplete = true;
        // Ensure progress is set to 1 (100%) at completion
        setProgress(1);
        
        // Delay before calling onComplete to ensure visual separation between sections
        if (onComplete) {
          animationTimer = setTimeout(() => {
            onComplete();
          }, 800); // Longer delay for better separation
        }
        return;
      }
      
      charIndex++;
      setProgress(charIndex / text.length);
      
      // Determine next character delay based on punctuation
      let nextCharDelay = 30; // Base delay
      
      // Current character for delay calculation
      const currentChar = text[charIndex - 1];
      
      // Check for different punctuation marks
      if (currentChar === '.') {
        nextCharDelay = 450; // Longer pause after periods
      } else if (currentChar === ',') {
        nextCharDelay = 200; // Medium pause after commas
      } else if (currentChar === ' ') {
        nextCharDelay = 50; // Slight pause after spaces
      } else if (currentChar === '?') {
        nextCharDelay = 350; // Pause after question marks
      } else if (currentChar === '!') {
        nextCharDelay = 400; // Pause after exclamation marks
      }
      
      // Schedule next character animation
      animationTimer = setTimeout(animate, nextCharDelay);
    };
    
    // Start the animation
    animate();
    
    // Return a function to cancel animation if needed
    return () => {
      if (animationTimer) {
        clearTimeout(animationTimer);
      }
      isComplete = true;
    };
  };

  // Function to animate card text with better sequencing
  const animateCardText = (cardId: number) => {
    // Reset all progress values first
    setTitleProgress(0);
    setParagraph1Progress(0);
    setParagraph2Progress(0);
    setParagraph3Progress(0);
    setParagraph4Progress(0);
    setParagraph5Progress(0);
    setLinkProgress(0);
    
    // Store active animation cancellation functions and timeouts
    const cancelFunctions: (() => void)[] = [];
    const timeouts: NodeJS.Timeout[] = [];
    
    // Define content structure with text and associated progress setter
    const cardName = getCardName(cardId);
    const contentItems = [
      {
        text: cardName,
        setProgress: setTitleProgress,
        delay: 800, // Delay after this item completes before starting next
      },
      {
        text: `Ah yes. The ${cardName}. Beautiful isn't it?`,
        setProgress: setParagraph1Progress,
        delay: 1000,
      },
      {
        text: `It reminds me of you. It came all the way from ${userLocation}.`,
        setProgress: setParagraph2Progress,
        delay: 1000,
      },
      {
        text: `Me? Well I spend most of my time tinkering with technology.`,
        setProgress: setParagraph3Progress,
        delay: 1000,
      },
      {
        text: `Why? Because it reminds me of magic, of course.`,
        setProgress: setParagraph4Progress,
        delay: 1000,
      },
      {
        text: `More? Well I guess I could share a couple of my notes with you.`,
        setProgress: setParagraph5Progress,
        delay: 1000,
      },
      {
        text: `Visit notes.krishkrosh.com`,
        setProgress: setLinkProgress,
        delay: 0, // No delay needed after the last item
      },
    ];
    
    // Function to animate items in sequence
    const animateSequence = (index = 0) => {
      if (index >= contentItems.length) return;
      
      const item = contentItems[index];
      
      // Create animation for current item
      const cancelAnimation = animateText(
        item.text,
        item.setProgress,
        () => {
          // Schedule next item after delay
          if (index < contentItems.length - 1) {
            const timeout = setTimeout(() => {
              animateSequence(index + 1);
            }, item.delay);
            
            timeouts.push(timeout);
          }
        }
      );
      
      // Add animation cancellation to our list
      cancelFunctions.push(cancelAnimation);
    };
    
    // Start animation sequence after initial delay
    const startTimeout = setTimeout(() => {
      animateSequence();
    }, 300);
    
    timeouts.push(startTimeout);
    
    // Return function to cancel all animations and clear timeouts
    return () => {
      // Cancel all active animations
      cancelFunctions.forEach(cancel => cancel());
      
      // Clear all pending timeouts
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  };

  // Helper function to get card name based on card ID
  const getCardName = (cardId: number): string => {
    const suits = ["♠", "♥", "♦", "♣"]
    const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    const suit = suits[Math.floor(cardId / 13)]
    const value = values[cardId % 13]
    return `${value} of ${suit === "♠" ? "Spades" : suit === "♥" ? "Hearts" : suit === "♦" ? "Diamonds" : "Clubs"}`
  }

  // Helper function to render text with character-by-character animation
  const renderAnimatedText = (text: string, progress: number) => {
    // Split the text into words
    const words = text.split(/(\s+)/);
    
    return (
      <>
        {words.map((word, wordIndex) => {
          // Calculate the start and end positions of this word in the original text
          const wordStart = words.slice(0, wordIndex).join('').length;
          const wordEnd = wordStart + word.length;
          
          // Calculate the progress of this word (based on the last character in the word)
          const wordEndProgress = wordEnd / text.length;
          
          // Check if any part of this word should be visible yet
          const isWordStarted = progress >= (wordStart + 1) / text.length;
          
          return (
            <span 
              key={wordIndex} 
              className="word-container"
              style={{
                display: 'inline-block', // Keeps the word together as a unit
                opacity: isWordStarted ? '1' : '0',
                marginRight: word.trim() === '' ? '0' : '0.2em' // Add slight spacing between words
              }}
            >
              {Array.from(word).map((char, charIndex) => {
                const absoluteCharIndex = wordStart + charIndex;
                const charProgress = (absoluteCharIndex + 1) / text.length;
                const isVisible = progress >= charProgress;
                
                return (
                  <span 
                    key={absoluteCharIndex} 
                    className={`card-info-char ${isVisible ? 'visible' : ''}`}
                    style={{
                      transitionDelay: `${absoluteCharIndex * 20}ms`,
                      whiteSpace: 'pre' // Preserve spaces
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </span>
          );
        })}
      </>
    );
  };

  useEffect(() => {
    // Add Google font to document head
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Lancelot&family=Overlock:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    return () => {
      // Clean up on unmount
      document.head.removeChild(link);
    };
  }, []);

  // Reset all progress when card is deselected and cancel any ongoing animations
  const [cancelAnimations, setCancelAnimations] = useState<(() => void) | null>(null);
  
  useEffect(() => {
    if (cardSelected) {
      // Card was selected, animations will start
    } else {
      // Card was deselected, cancel any ongoing animations
      if (cancelAnimations) {
        cancelAnimations();
        setCancelAnimations(null);
      }
      
      // Reset all progress
      setTitleProgress(0);
      setParagraph1Progress(0);
      setParagraph2Progress(0);
      setParagraph3Progress(0);
      setParagraph4Progress(0);
      setParagraph5Progress(0);
      setLinkProgress(0);
    }
  }, [cardSelected, cancelAnimations]);

  // Handle card selection state change
  const handleCardSelectionChange = (isSelected: boolean, cardId?: number | null): void => {
    setCardSelected(isSelected)
    setSelectedCardId(cardId ?? null)
    
    // Cancel any existing animations
    if (cancelAnimations) {
      cancelAnimations();
      setCancelAnimations(null);
    }
    
    // Hide the mystical text when a card is selected
    if (isSelected && cardId !== null && cardId !== undefined) {
      fadeOutAndHide()
      // Start fade-in animation after a small delay
      setTimeout(() => {
        setPanelFadeIn(true)
        // Start character-by-character animation and store cancellation function
        const cancelFn = animateCardText(cardId);
        setCancelAnimations(() => cancelFn);
      }, 300)
    } else {
      setPanelFadeIn(false)
    }
  }

  return (
    <div 
      ref={containerRef}
      className="h-screen w-full cursor-pointer relative" 
      onPointerMove={handlePointerMove}
    >
      <style jsx global>{`
        @keyframes fadeIn {
          0% { 
            opacity: 0;
          }
          100% { 
            opacity: 1;
          }
        }
        
        .mystical-text-container {
          font-family: 'Lancelot', serif;
          font-size: 1.5rem;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.95);
          margin: 0.7rem 0;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          line-height: 0.75;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.15);
          max-width: 80%;
          margin-left: auto;
          margin-right: auto;
        }
        
        .mystical-char {
          display: inline-block;
          opacity: 0;
          transition: opacity 0.45s ease-out;
          white-space: pre;
        }
        
        .mystical-char.visible {
          opacity: 1;
        }
        
        .mystical-text-wrapper {
          opacity: 1;
          transition: opacity 0.6s ease-out;
        }
        
        .mystical-text-wrapper.fade-out {
          opacity: 0;
        }
        
        .card-info-panel {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          right: 25%; /* Position in the middle of the right half of the screen */
          width: 350px; /* Restore proper width */
          z-index: 10;
          font-family: 'Lancelot', serif;
          color: white;
          text-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 1s ease-in-out;
          pointer-events: none;
          /* Center the panel horizontally in its position */
          margin-right: -150px; /* Half the width to center it */
        }
        
        /* Responsive positioning for different screen sizes */
        @media (max-width: 1200px) {
          .card-info-panel {
            right: 20%;
          }
        }
        
        @media (max-width: 768px) {
          .card-info-panel {
            right: 50%;
            margin-right: -150px;
            top: 65%; /* Move down on smaller screens */
          }
        }
        
        @media (max-width: 640px) {
          .card-info-panel {
            right: 50%;
            margin-right: -150px;
            top: 70%; /* Move further down on mobile */
            width: 280px;
            margin-right: -140px;
          }
        }
        
        .card-info-panel.active {
          opacity: 1;
          pointer-events: auto;
        }
        
        .card-info-panel h2 {
          font-size: 2rem;
          margin-bottom: 1.5rem;
          text-align: center;
          display: block;
        }
        
        .card-info-panel p {
          font-family: 'Overlock', sans-serif;
          font-size: 1.1rem;
          line-height: 1.5;
          margin-bottom: 1rem;
          display: block;
        }
        
        .card-info-panel a {
          font-family: 'Overlock', sans-serif;
          font-style: italic;
          color: #88ccff;
          text-decoration: none;
          display: block;
          text-align: center;
          margin-top: 1.5rem;
          font-size: 1.2rem;
          transition: color 0.3s ease;
          pointer-events: auto;
        }
        
        .card-info-panel a:hover {
          color: #b8e0ff;
          text-shadow: 0 0 8px rgba(136, 204, 255, 0.6);
        }
        
        .card-info-char {
          display: inline-block;
          opacity: 0;
          transition: opacity 0.45s ease-out;
        }
        
        .card-info-char.visible {
          opacity: 1;
        }
        
        @media (max-width: 768px) {
          .card-info-panel {
            top: auto;
            bottom: 10%;
            right: 50%;
            transform: translateX(50%);
            width: 80%;
            max-width: 300px;
          }
          
          .card-info-panel h2 {
            font-size: 1.8rem;
          }
          
          .card-info-panel p {
            font-size: 1rem;
          }
        }
      `}</style>
      
      {contextLost ? (
        <div className="h-full w-full flex items-center justify-center bg-black text-white">
          <p>WebGL context lost. Attempting to recover...</p>
        </div>
      ) : (
        <>
          <Canvas 
            shadows 
            camera={{ position: [0, 0, 8], fov: 50 }}
            onCreated={({ gl }) => {
              // Add event listener for context lost
              gl.domElement.addEventListener('webglcontextlost', handleContextLost, false);
            }}
            gl={{ 
              powerPreference: 'high-performance',
              antialias: false, // Disable antialiasing for better performance
              depth: true,
              stencil: false, // Disable stencil buffer if not needed
              alpha: false // Disable alpha for better performance
            }}
            dpr={[1, 1.5]} // Limit pixel ratio for better performance
          >
            {/* Background that follows the camera */}
            <CameraBackground pauseAnimations={cardSelected} />
            
            {/* Ambient light for base illumination */}
            <ambientLight intensity={0.2} />

            {/* Main directional light with shadow - reduced shadow map size */}
            <directionalLight
              position={[5, 5, 5]}
              intensity={1}
              color="#fff9d6"
              castShadow
              shadow-mapSize-width={512}
              shadow-mapSize-height={512}
            />

            {/* Spotlight for dramatic effect */}
            <spotLight position={[0, 10, 0]} angle={0.3} penumbra={0.8} intensity={1.5} color="#ffd700" castShadow />

            {/* Golden rim light */}
            <pointLight position={[-5, 0, -5]} intensity={0.8} color="#ffd700" />

            <CardDeck 
              hovered={hovered} 
              expanded={expanded} 
              onSelectionChange={handleCardSelectionChange}
            />

            {/* Environment for reflections - using a simpler preset */}
            <Environment preset="night" />

            {/* Scene Controls */}
            <SceneController expanded={expanded} cardSelected={cardSelected} />
          </Canvas>
          
          {/* Card Info Panel (HTML overlay) with character-by-character animation */}
          {selectedCardId !== null && (
            <div className={`card-info-panel ${panelFadeIn ? 'active' : ''}`}>
              <h2>
                {renderAnimatedText(getCardName(selectedCardId), titleProgress)}
              </h2>
              <p>
                {renderAnimatedText(`Ah yes. The ${getCardName(selectedCardId)}. Beautiful isn't it?`, paragraph1Progress)}
              </p>
              <p>
                {renderAnimatedText(`It reminds me of you. It came all the way from ${userLocation}.`, paragraph2Progress)}
              </p>
              <p>
                {renderAnimatedText(`Me? Well I spend most of my time tinkering with technology.`, paragraph3Progress)}
              </p>
              <p>
                {renderAnimatedText(`Why? Because it reminds me of magic, of course.`, paragraph4Progress)}
              </p>
              <p>
                {renderAnimatedText(`More? Well I guess I could share a couple of my notes with you.`, paragraph5Progress)}
              </p>
              <a href="https://notes.krishkrosh.com" target="_blank" rel="noopener noreferrer">
                {renderAnimatedText(`Visit notes.krishkrosh.com`, linkProgress)}
              </a>
            </div>
          )}
          
          {/* Mystical text overlay */}
          {mysticalTextContent}
        </>
      )}
    </div>
  )
}

interface SceneControllerProps {
  expanded: boolean;
  cardSelected: boolean;
}

function SceneController({ expanded, cardSelected }: SceneControllerProps) {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const lastUpdateTime = useRef<number>(0)
  const updateInterval = 50 // milliseconds between camera position updates
  const initialCameraPosition = useRef(new Vector3(0, 0, 8))
  
  // Store initial camera position
  useEffect(() => {
    if (camera) {
      initialCameraPosition.current.copy(camera.position)
    }
  }, [camera])

  // When a card is selected, ensure camera is reset to a fixed position
  useEffect(() => {
    if (cardSelected && camera) {
      // Fix camera to a specific position directly in front
      camera.position.set(0, 0, 8);
      camera.lookAt(0, 0, 0);
      
      // Store this known good position
      initialCameraPosition.current.copy(camera.position);
    }
  }, [cardSelected, camera]);

  // Ensure camera doesn't move when a card is selected
  useFrame(() => {
    if (expanded && !cardSelected) {
      const now = Date.now();
      // Only update camera position at specified intervals to reduce CPU usage
      if (now - lastUpdateTime.current > updateInterval) {
        // Much gentler camera movement - just a subtle drift
        const time = Date.now() * 0.00005; // Slower movement
        
        // Start from initial position and apply very gentle movement
        camera.position.x = initialCameraPosition.current.x + Math.sin(time) * 2;
        camera.position.y = initialCameraPosition.current.y + Math.sin(time * 1.3) * 0.5;
        // Keep z-distance more stable to prevent background issues
        camera.position.z = initialCameraPosition.current.z + 0.5 * Math.sin(time * 0.7);
        
        camera.lookAt(0, 0, 0);
        lastUpdateTime.current = now;
      }
    } else if (cardSelected) {
      // Force camera to stay in fixed position when card is selected
      camera.position.set(0, 0, 8);
      camera.lookAt(0, 0, 0);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={false}
      enablePan={false}
      enableRotate={!expanded && !cardSelected}
      minPolarAngle={Math.PI / 3}
      maxPolarAngle={Math.PI / 1.5}
    />
  )
}
