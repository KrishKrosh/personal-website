"use client"

import { useRef, useState, useMemo, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { MeshStandardMaterial, DoubleSide, Vector3, Group, Shape, ExtrudeGeometry, 
         MeshBasicMaterial, Euler } from "three"
import { Text } from "@react-three/drei"

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

export default function Card({ card, hovered, expanded, isSelected = false, allCardsSelected = false, onSelect }: CardProps) {
  const meshRef = useRef<Group>(null)
  const [suit] = useState(suits[Math.floor(card.id / 13)])
  const [value] = useState(values[card.id % 13])
  const [isRed] = useState(suit === "♥" || suit === "♦")
  const [isCardHovered, setIsCardHovered] = useState(false)
  const { pointer, viewport } = useThree()
  
  // State for animation
  const [outlineIntensity, setOutlineIntensity] = useState(0)
  const [pulsePhase, setPulsePhase] = useState(Math.random() * Math.PI * 2)
  const [selectionProgress, setSelectionProgress] = useState(0)
  const [opacity, setOpacity] = useState(1)
  
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

  // Calculate tilt based on pointer position (for selected card)
  const calculateTilt = () => {
    if (!isSelected) return { x: 0, y: 0 };
    
    // Convert pointer coordinates to normalized values (-1 to 1)
    const x = (pointer.x * viewport.width) / 2;
    const y = (pointer.y * viewport.height) / 2;
    
    // Calculate tilt angles (limit to small values for subtle effect)
    return {
      x: y * 0.1, // Tilt around X axis based on Y position
      y: x * 0.1, // Tilt around Y axis based on X position
    };
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
    let targetOpacity = 1

    // Update selection progress
    if (isSelected) {
      setSelectionProgress(prev => Math.min(prev + 0.05 * frameFactor, 1))
    } else {
      setSelectionProgress(prev => Math.max(prev - 0.05 * frameFactor, 0))
    }

    // Handle opacity for non-selected cards
    if (allCardsSelected && !isSelected) {
      targetOpacity = 0.2
    } else {
      targetOpacity = 1
    }
    setOpacity(currentOpacity => currentOpacity + (targetOpacity - currentOpacity) * 0.1 * frameFactor)

    if (isSelected) {
      // Position the selected card on the left side
      targetPosition.set(-3, 0, 0)
      
      // Apply subtle tilt based on cursor position
      const tilt = calculateTilt()
      meshRef.current.rotation.x = tilt.x
      meshRef.current.rotation.y = tilt.y
      meshRef.current.rotation.z = 0
      
      // Slightly larger scale for the selected card
      targetScale = 1.5
      
      // Set outline intensity for the selected card
      setOutlineIntensity(0.8 + Math.sin(time * 2) * 0.2)
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
      // Globe formation with smooth orbital movement
      const t = time * speed + phase

      // Calculate position on the sphere
      const x = Math.sin(t) * Math.cos(t * 2) * radius
      const y = Math.cos(t) * radius * 0.6
      const z = Math.sin(t * 2) * radius
      
      if (isCardHovered) {
        // Move hovered card slightly outward for emphasis
        const hoverDirection = new Vector3(x, y, z).normalize()
        targetPosition = new Vector3(
          x + hoverDirection.x * 0.5,
          y + hoverDirection.y * 0.5,
          z + hoverDirection.z * 0.5
        )
        
        // Smooth scale animation on hover
        const hoverScale = scale * (1.2 + Math.sin(time * 3 + pulsePhase) * 0.05)
        targetScale = hoverScale
        
        // Animate outline intensity with a subtle pulsing effect
        const targetOutline = 0.9 + Math.sin(time * 2) * 0.1
        setOutlineIntensity(intensity => intensity + (targetOutline - intensity) * 0.05)
      } else {
        // Standard position for non-hovered cards
        targetPosition.set(x, y, z)
        targetScale = scale
        
        // Fade out outline when not hovered
        setOutlineIntensity(intensity => intensity > 0.01 ? intensity * 0.9 : 0)
      }

      // Direct rotation application with frame-rate independence
      // This preserves the unique rotation of each card based on its axis
      meshRef.current.rotation.x += axis.x * 0.01 * frameFactor
      meshRef.current.rotation.y += axis.y * 0.01 * frameFactor
      meshRef.current.rotation.z += axis.z * 0.01 * frameFactor
    }

    // Apply smooth position transitions
    const positionLerpFactor = 0.06 * frameFactor
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
  
  // Card interaction handlers - only active in expanded mode
  const handlePointerOver = () => {
    if (expanded) {
      setIsCardHovered(true)
      document.body.style.cursor = 'pointer'
    }
  }
  
  const handlePointerOut = () => {
    setIsCardHovered(false)
    document.body.style.cursor = 'auto'
  }
  
  const handleClick = () => {
    if (expanded && isCardHovered && onSelect) {
      onSelect(card.id);
    }
  }

  return (
    <group 
      ref={meshRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* Sleek outline effect for when card is hovered - render first for proper z-ordering */}
      {(expanded || isSelected) && outlineIntensity > 0 && (
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

      {/* Card face - simplified with better material settings for improved performance */}
      <mesh geometry={cardGeometry} renderOrder={0}>
        <meshStandardMaterial 
          color="#ffffff" 
          roughness={0.2} 
          metalness={0.1}
          side={DoubleSide}
          transparent={allCardsSelected}
          opacity={opacity}
        />
      </mesh>

      {/* Card face text/symbols rendered directly on the card */}
      <group position={[0, 0, thickness/2 + 0.001]} renderOrder={2}>
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
      </group>

      {/* Card back design - simplified */}
      <group position={[0, 0, -thickness / 2 - 0.001]} rotation={[Math.PI, 0, 0]} renderOrder={1}>
        <mesh>
          <planeGeometry args={[width - 0.1, height - 0.1]} />
          <meshStandardMaterial 
            color="#ffd700" 
            metalness={0.8} 
            roughness={0.1} 
            side={DoubleSide} 
            transparent={allCardsSelected}
            opacity={opacity}
          />
        </mesh>

        {/* Simple decorative element */}
        <Text
          position={[0, 0, 0.002]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          ♣
        </Text>
      </group>
    </group>
  )
}

