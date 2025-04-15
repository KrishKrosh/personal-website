"use client"

import { useRef, useState, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Environment, OrbitControls, Plane, useTexture } from "@react-three/drei"
import { Group, Camera, Vector3, Color, MeshStandardMaterial, ShaderMaterial, PointLight, DirectionalLight } from "three"
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
  const [narrativeLines, setNarrativeLines] = useState<string[]>([])

  useEffect(() => {
    // Easter egg: track visits using localStorage
    const visitCount = parseInt(localStorage.getItem('mysticalTextVisitCount') || '0', 10) + 1
    localStorage.setItem('mysticalTextVisitCount', visitCount.toString())
    console.log(`[MysticalText] Visit count:`, visitCount)
    if (visitCount === 2) {
      setNarrativeLines([
        "Nice to meet you. I'm Krish.",
        "Wait... haven't I seen you around before?",
        "I guess that means you know the drill."
      ])
    } else {
      setNarrativeLines([
        "Nice to meet you. I'm Krish.",
        "One fun fact about me is that I like magic.",
        "So go ahead. Pick a card. Any card."
      ])
    }
  }, [])
  
  // Start the text animation sequence after a short delay
  useEffect(() => {
    if (narrativeLines.length === 0) return;
    const startTextAnimation = setTimeout(() => {
      showNextLine(0)
    }, 800) // Slightly longer delay to ensure everything is loaded properly
    return () => clearTimeout(startTextAnimation)
  }, [narrativeLines])
  
  // Lines to display in sequence
  // const narrativeLines = [
  //   "Nice to meet you. I'm Krish.",
  //   "One fun fact about me is that I like magic.",
  //   "So go ahead. Pick a card. Any card."
  // ]
  
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
  const [isMobile, setIsMobile] = useState<boolean>(false)
  
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
  
  // Reference to track the current animation cycle - each new card gets a unique ID
  const animationCycleRef = useRef<number>(0)
  
  // Store all timers in a ref to ensure we can clear them all during cleanup
  const allTimersRef = useRef<NodeJS.Timeout[]>([])
  
  // Function to safely set up a timer that we can track and clean up
  const safeSetTimeout = (callback: () => void, delay: number): NodeJS.Timeout => {
    const timer = setTimeout(() => {
      // Remove this timer from the list when it executes
      allTimersRef.current = allTimersRef.current.filter(t => t !== timer)
      callback()
    }, delay)
    
    // Add timer to our list
    allTimersRef.current.push(timer)
    return timer
  }
  
  // Function to clear all active timers
  const clearAllTimers = () => {
    allTimersRef.current.forEach(timer => clearTimeout(timer))
    allTimersRef.current = []
  }
  
  // Get mystical text and interaction permission
  const { mysticalTextContent, allowInteraction, fadeOutAndHide, showOnlyPickCardLine } = MysticalText()

  // Map to store custom text for different cards
  // This is a central place to define all card-specific stories
  const cardStoryMap: Record<string, string> = {
    // Jack cards (customize these messages as desired)
    "10-0": "the time I first pet a robot dog myself", // Jack of Spades
    "10-1": "the time I built my first computer when I was 14", // Jack of Hearts
    "10-2": "the time I played my first game of chess", // Jack of Diamonds
    "10-3": "the time I went to my first speedcubing competition", // Jack of Clubs
    
    // Queen cards (customize these messages as desired)
    "11-0": "the months I worked on InternetActivism", // Queen of Spades
    "11-1": "my very first non-sunday Socratica event", // Queen of Hearts
    "11-2": "the many hours I spent inside my Quest and Vision Pro", // Queen of Diamonds
    "11-3": "when I snowboarded in the Swiss Alps (and got a concussion)", // Queen of Clubs
    
    // King cards (customize these messages as desired)
    "12-0": "the time I built a hair cutting robot", // King of Spades
    "12-1": "the time I made a record-breaking card launcher", // King of Hearts
    "12-2": "the time I took meetings with electrodes stuck to my head", // King of Diamonds
    "12-3": "the time I hosted the biggest robot hackathon in history" // King of Clubs
  };
  
  // Helper function to get card story text based on cardId
  const getCardStoryText = (cardId: number): string => {
    const cardValue = cardId % 13;
    const suitValue = Math.floor(cardId / 13);
    const cardKey = `${cardValue}-${suitValue}`;
    
    // Check if we have custom text for this card
    const isJQK = cardValue >= 10 && cardValue <= 12; // J, Q, K are 10, 11, 12
    const customText = cardStoryMap[cardKey] || "";
    
    if (isJQK) {
      return `It reminds me of ${customText}. Weirdly I picked the card up in ${userLocation}.`;
    } else {
      return `It reminds me of you. It came all the way from ${userLocation}.`;
    }
  };

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

  // Detect if the device is mobile on component mount
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
      const mobile = Boolean(
        userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i)
      );
      setIsMobile(mobile);
    };
    
    checkIfMobile();
    
    // Also add a listener for window resizing to detect device changes
    const handleResize = () => {
      checkIfMobile();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
      
      // Only do hover detection on desktop devices
      if (!isMobile) {
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
  }

  // Handle click/tap anywhere on the screen (primarily for mobile)
  const handleClick = () => {
    if (isMobile && !hovered && allowInteraction) {
      setHovered(true)
      
      // After a delay, trigger the expanded state
      setTimeout(() => {
        setExpanded(true)
        // When cards explode, show only the last line
        showOnlyPickCardLine()
      }, 1500)
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
  const animateText = (text: string, setProgress: (progress: number) => void, cycleId: number, onComplete?: () => void) => {
    let charIndex = 0;
    
    // Force immediate reset
    setProgress(0);
    
    const animate = () => {
      // Check if this animation has been superseded by a new cycle
      if (cycleId !== animationCycleRef.current) return;
      
      if (charIndex >= text.length) {
        // We've finished
        setProgress(1);
        
        // Schedule the completion callback after a delay
        if (onComplete) {
          safeSetTimeout(() => {
            // Double-check cycle is still valid before calling completion
            if (cycleId === animationCycleRef.current) {
              onComplete();
            }
          }, 800);
        }
        return;
      }
      
      charIndex++;
      setProgress(charIndex / text.length);
      
      // Determine delay based on punctuation
      let nextCharDelay = 10; // Base delay
      const currentChar = text[charIndex - 1];
      
      if (currentChar === '.') {
        nextCharDelay = 300; // Longer pause after periods
      } else if (currentChar === ',') {
        nextCharDelay = 150; // Medium pause after commas
      } else if (currentChar === ' ') {
        nextCharDelay = 30; // Slight pause after spaces
      } else if (currentChar === '?') {
        nextCharDelay = 250; // Pause after question marks
      } else if (currentChar === '!') {
        nextCharDelay = 250; // Pause after exclamation marks
      }
      
      // Schedule next character animation only if we're still in the same animation cycle
      safeSetTimeout(() => {
        if (cycleId === animationCycleRef.current) {
          animate();
        }
      }, nextCharDelay);
    };
    
    // Start the animation after a brief delay to ensure cleanup from previous animations
    safeSetTimeout(() => {
      if (cycleId === animationCycleRef.current) {
        animate();
      }
    }, 50);
  };

  // Function to animate card text with better sequencing
  const animateCardText = (cardId: number) => {
    // Generate a new animation cycle ID
    const thisCycleId = ++animationCycleRef.current;
    
    // Clear any previous timers and reset states
    clearAllTimers();
    resetAllAnimationProgress();
    
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
        delay: 500,
      },
      {
        text: getCardStoryText(cardId),
        setProgress: setParagraph2Progress,
        delay: 500,
      },
      {
        text: `Me? Well I spend most of my time tinkering with technology.`,
        setProgress: setParagraph3Progress,
        delay: 500,
      },
      {
        text: `Why? Because it reminds me of magic, of course.`,
        setProgress: setParagraph4Progress,
        delay: 500,
      },
      {
        text: `More? Well I guess I could share a couple of my notes with you.`,
        setProgress: setParagraph5Progress,
        delay: 500,
      },
      {
        text: `Visit notes.krishkrosh.com`,
        setProgress: setLinkProgress,
        delay: 0, // No delay needed after the last item
      },
    ];
    
    // Function to animate items in sequence
    const animateSequence = (index = 0) => {
      if (index >= contentItems.length || thisCycleId !== animationCycleRef.current) return;
      
      const item = contentItems[index];
      
      // Animate current item and set up the next one when it completes
      animateText(
        item.text,
        item.setProgress,
        thisCycleId,
        () => {
          // Only schedule next item if we're still in the same animation cycle
          if (thisCycleId === animationCycleRef.current && index < contentItems.length - 1) {
            safeSetTimeout(() => {
              if (thisCycleId === animationCycleRef.current) {
                animateSequence(index + 1);
              }
            }, item.delay);
          }
        }
      );
    };
    
    // Start animation sequence after initial delay
    safeSetTimeout(() => {
      if (thisCycleId === animationCycleRef.current) {
        animateSequence();
      }
    }, 350);
  };

  // Helper function to get card name based on card ID
  const getCardName = (cardId: number): string => {
    const suits = ["♠", "♥", "♦", "♣"]
    const suitNames = ["Spades", "Hearts", "Diamonds", "Clubs"]
    
    // Full value names instead of abbreviations
    const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    const fullValueNames = ["Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King"]
    
    const suitIndex = Math.floor(cardId / 13)
    const valueIndex = cardId % 13
    
    const suit = suitNames[suitIndex]
    const value = fullValueNames[valueIndex]
    
    return `${value} of ${suit}`
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

  // State to control fade-in for selected card text
  const [showSelectedText, setShowSelectedText] = useState(false)

  // When a card is selected, show all text at once with fade-in
  useEffect(() => {
    if (cardSelected && selectedCardId !== null) {
      setShowSelectedText(false)
      // Longer pause before fade-in
      const t = setTimeout(() => setShowSelectedText(true), 700)
      return () => clearTimeout(t)
    } else {
      setShowSelectedText(false)
    }
  }, [cardSelected, selectedCardId])

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
  
  // Function to completely reset all animation progress states
  const resetAllAnimationProgress = () => {
    // Immediately set all progress values to 0
    setTitleProgress(0);
    setParagraph1Progress(0);
    setParagraph2Progress(0);
    setParagraph3Progress(0);
    setParagraph4Progress(0);
    setParagraph5Progress(0);
    setLinkProgress(0);
  };
  
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
      resetAllAnimationProgress();
    }
  }, [cardSelected, cancelAnimations]);

  // Handle card selection state change
  const handleCardSelectionChange = (isSelected: boolean, cardId?: number | null): void => {
    // Update selection state
    setCardSelected(isSelected);
    setSelectedCardId(cardId ?? null);
    
    // Create a new animation cycle which will invalidate any ongoing animations
    animationCycleRef.current++;
    clearAllTimers();
    
    // Force reset of all animation progress states to ensure clean state
    resetAllAnimationProgress();
    
    // Hide the mystical text when a card is selected
    if (isSelected && cardId !== null && cardId !== undefined) {
      fadeOutAndHide();
      
      // Start fade-in animation after a delay to ensure previous animations are completely cleared
      safeSetTimeout(() => {
        setPanelFadeIn(true);
      }, 400); // Even longer delay to ensure clean state
    } else {
      setPanelFadeIn(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      onPointerMove={handlePointerMove}
      onClick={handleClick} // Add click handler for mobile
    >
      {/* Context lost message */}
      {contextLost && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black text-white">
          <div className="rounded-lg bg-black/90 p-6 text-center">
            <h2 className="mb-4 text-xl font-semibold">Recovering WebGL context...</h2>
            <p>The 3D environment is reloading. This should only take a moment.</p>
          </div>
        </div>
      )}

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
          /* Position from left, slightly offset to the right */
          left: 50%; 
          margin-left: 100px; /* Push right from center */
          /* Remove right/margin-right */
          /* right: 40%; */ 
          /* margin-right: -175px; */
          width: 400px; 
          z-index: 10;
          font-family: 'Lancelot', serif;
          color: white;
          text-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 1.5s ease-in-out;
          pointer-events: none;
        }
        
        /* Responsive positioning for larger tablets/small desktops */
        @media (max-width: 1200px) {
          .card-info-panel {
            /* Adjust left positioning for tablets */
            left: 50%; 
            margin-left: 0px; /* Closer to center on smaller screens */
            /* Remove right/margin-right */
            /* right: 35%; */ 
            /* margin-right: -175px; */
          }
        }
        
        .card-info-panel h2 {
          font-size: 2.2rem; /* Increased size */
          margin-bottom: 1.5rem;
          text-align: center;
          display: block;
        }
        
        .card-info-panel p {
          font-family: 'Overlock', sans-serif;
          font-size: 1.2rem; /* Increased size */
          line-height: 1.5;
          margin-bottom: 1rem;
          display: block;
          text-align: left; 
        }
        
        .card-info-panel a {
          font-family: 'Overlock', sans-serif;
          font-style: italic;
          color: #88ccff;
          text-decoration: none;
          display: block;
          text-align: center;
          margin-top: 1.5rem;
          font-size: 1.3rem; /* Increased size */
          transition: color 0.3s ease;
          pointer-events: auto;
          cursor: pointer; 
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
        
        /* Consolidated Mobile Styles (Tablets and Phones) */
        @media (max-width: 768px) { 
          .card-info-panel {
            /* Override desktop positioning */
            top: auto; 
            right: auto;
            margin-right: 0; 

            /* Center horizontally */
            left: 50%; 
            transform: translateX(-50%); 
            
            /* Position from bottom */
            bottom: 5%; 
            
            /* Responsive width */
            width: 90%; 
            max-width: 350px; /* Limit maximum width */

            /* Ensure text alignment is centered on mobile (overrides p style) */
            text-align: center;
          }
          
          .card-info-panel h2 {
            font-size: 1.6rem; /* Slightly smaller heading */
            margin-bottom: 1rem;
          }
          
          .card-info-panel p {
            font-size: 0.95rem; /* Smaller paragraph text */
            line-height: 1.4;
            margin-bottom: 0.8rem;
            text-align: center; /* Ensure paragraphs are centered on mobile */
          }

          .card-info-panel a {
            font-size: 1rem; /* Smaller link text */
            margin-top: 1rem;
          }
        }
        
        /* Add clickable class for elements that should have pointer cursor */
        .clickable {
          cursor: pointer;
        }
        
        /* Fade-in effect for selected card text */
        .selected-card-text {
          opacity: 0;
          transition: opacity 1.5s cubic-bezier(0, 0, 0.9, 1);
        }
        
        .selected-card-text.fade-in {
          opacity: 1;
        }
      `}</style>
      
      {contextLost ? (
        <div className="h-full w-full flex items-center justify-center bg-black text-white">
          <p>WebGL context lost. Attempting to recover...</p>
        </div>
      ) : (
        <>
          <Canvas
            gl={{ 
              antialias: !isMobile, // Disable antialiasing on mobile
              powerPreference: "high-performance",
              alpha: true,
              depth: true,
              stencil: false,
              precision: isMobile ? "lowp" : "highp", // Lower precision on mobile
            }}
            camera={{ position: [0, 0, 8], fov: 40 }}
            dpr={isMobile ? [1, 1.5] : [1, 2]} // Lower pixel ratio on mobile
            performance={{ min: 0.1 }}
            shadows={!isMobile} // Disable shadows on mobile
            onCreated={({ gl }) => {
              // Add event listener for context lost
              gl.domElement.addEventListener('webglcontextlost', handleContextLost, false);
            }}
          >
            {/* CameraBackground follows the camera to create an infinite background */}
            <CameraBackground pauseAnimations={cardSelected} />
            
            {/* Ambient light for base illumination */}
            <ambientLight intensity={0.25} />

            {/* Main directional light with shadow - reduced shadow map size */}
            <directionalLight
              position={[5, 5, 5]}
              intensity={1.2}
              color="#fff9d6"
              castShadow
              shadow-mapSize-width={512}
              shadow-mapSize-height={512}
            />

            {/* Spotlight for dramatic effect */}
            <spotLight position={[0, 10, 0]} angle={0.3} penumbra={0.8} intensity={1.5} color="#ffd700" castShadow />

            {/* Golden rim light */}
            <pointLight position={[-5, 0, -5]} intensity={0.8} color="#ffd700" />

            {/* New: Directional light above camera, aimed at card deck for strong reflections */}
            <directionalLight
              position={[0, 2, 8]} // Above and in front of camera
              intensity={2.5}
              color="#ffffff"
              target-position={[0, 0, 0]} // Aiming at the card deck center
              castShadow={false}
            />
            
            {/* Dynamic moving light for reflections */}
            <MovingLight />

            <CardDeck 
              hovered={hovered} 
              expanded={expanded} 
              onSelectionChange={handleCardSelectionChange}
            />

            {/* Environment for reflections - using a more reflective preset */}
            <Environment preset="studio" />

            {/* Scene Controls */}
            <SceneController expanded={expanded} cardSelected={cardSelected} isMobile={isMobile} />
          </Canvas>
          
          {/* Card Info Panel (HTML overlay) with fade-in */}
          {selectedCardId !== null && (
            <div className={`card-info-panel ${panelFadeIn ? 'active' : ''}`}>
              <div className={`selected-card-text ${showSelectedText ? 'fade-in' : ''}`}>
                <h2>{getCardName(selectedCardId)}</h2>
                <p>Ah yes. The {getCardName(selectedCardId)}. Beautiful isn't it?</p>
                <p>{getCardStoryText(selectedCardId)}</p>
                <p>Me? Well I spend most of my time tinkering with technology.</p>
                <p>Why? Because it reminds me of magic, of course.</p>
                <p>More? Well I guess I could share a couple of my notes with you.</p>
                <a 
                  href="https://notes.krishkrosh.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="clickable"
                >
                  Visit notes.krishkrosh.com
                </a>
              </div>
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
  isMobile: boolean;
}

function SceneController({ expanded, cardSelected, isMobile }: SceneControllerProps) {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const lastUpdateTime = useRef<number>(0)
  const updateInterval = isMobile ? 100 : 50 // Longer interval on mobile for better performance
  // Adjust initial Z based on mobile
  const initialCameraPosition = useRef(new Vector3(0, 0, isMobile ? 12 : 8))
  
  // Store initial camera position (if needed, though ref default handles it)
  useEffect(() => {
    if (camera && !initialCameraPosition.current.equals(camera.position)) {
      // This might be redundant now with the ref initialization, 
      // but safer to ensure camera matches the intended initial state.
      camera.position.copy(initialCameraPosition.current) 
    }
  }, [camera, isMobile]) // Add isMobile dependency

  // When a card is selected, ensure camera is reset to the correct initial position
  useEffect(() => {
    if (cardSelected && camera) {
      // Use the calculated initial position (respects mobile Z distance)
      camera.position.copy(initialCameraPosition.current);
      camera.lookAt(0, 0, 0);
      
      // No need to copy back to initialCameraPosition.current here
    }
  }, [cardSelected, camera]); // Removed initialCameraPosition from deps as it's a ref

  // Ensure camera doesn't move when a card is selected
  useFrame(() => {
    if (expanded && !cardSelected) {
      const now = Date.now();
      // Only update camera position at specified intervals to reduce CPU usage
      if (now - lastUpdateTime.current > updateInterval) {
        // Much gentler camera movement - just a subtle drift
        const time = Date.now() * 0.00005; // Slower movement
        
        // Start from initial position and apply very gentle movement
        // Apply reduced camera movement on mobile
        const movementScale = isMobile ? 0.5 : 1.0;
        // Use the initial position components directly (which now account for mobile Z)
        camera.position.x = initialCameraPosition.current.x + Math.sin(time) * 2 * movementScale;
        camera.position.y = initialCameraPosition.current.y + Math.sin(time * 1.3) * 0.5 * movementScale;
        // Keep z-distance more stable based on the initial Z
        camera.position.z = initialCameraPosition.current.z + 0.5 * Math.sin(time * 0.7) * movementScale;
        
        camera.lookAt(0, 0, 0);
        lastUpdateTime.current = now;
      }
    } else if (cardSelected) {
      // Force camera to stay in the calculated initial position when card is selected
      camera.position.copy(initialCameraPosition.current);
      camera.lookAt(0, 0, 0);
    }
  }); // Removed initialCameraPosition from deps

  // Disable controls completely on mobile when expanded for better performance
  if (isMobile && expanded) {
    return null;
  }

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={false}
      enablePan={false}
      enableRotate={!expanded && !cardSelected && !isMobile}
      minPolarAngle={Math.PI / 3}
      maxPolarAngle={Math.PI / 1.5}
      rotateSpeed={isMobile ? 0.5 : 1} // Slower rotation on mobile
    />
  )
}

function MovingLight() {
  const lightRef = useRef<PointLight>(null);
  const { clock } = useThree();

  useFrame(() => {
    if (lightRef.current) {
      const time = clock.getElapsedTime();
      lightRef.current.position.x = Math.sin(time) * 5;
      lightRef.current.position.z = Math.cos(time) * 5;
    }
  });

  return (
    <pointLight
      ref={lightRef}
      intensity={0.5}
      color="#ff69b4"
      position={[0, 0, 0]}
    />
  );
}
