"use client"

import { useRef, useMemo, useState, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import { MathUtils, Vector3, Group } from "three"
import Card from "./card"
import { InfoPanel } from "./card-info"

// Define props interface for CardDeck
interface CardDeckProps {
  hovered: boolean;
  expanded: boolean;
  onSelectionChange?: (isSelected: boolean) => void;
}

// Interface for card data
interface CardData {
  id: number;
  initialPosition: Vector3;
  rotation: number[];
  radius: number;
  speed: number;
  phase: number;
  axis: Vector3;
  scale: number;
}

export default function CardDeck({ hovered, expanded, onSelectionChange }: CardDeckProps) {
  const groupRef = useRef<Group>(null)
  // Reduce the number of cards to improve performance
  const numCards = 52 // Half a standard deck for better performance
  
  // State for selected card
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null)
  
  // Create card data with initial positions
  const cards = useMemo<CardData[]>(() => {
    return Array.from({ length: numCards }, (_, i) => ({
      id: i,
      // Initial position is stacked with slight offset
      initialPosition: new Vector3(
        MathUtils.randFloatSpread(0.1),
        i * 0.01 - numCards * 0.005,
        MathUtils.randFloatSpread(0.1),
      ),
      // Random rotation for when expanded
      rotation: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2],
      // Random radius for the globe formation
      radius: 3 + Math.random() * 2,
      // Random speed for rotation - reduced for better performance
      speed: 0.1 + Math.random() * 0.2,
      // Random phase for varied movement
      phase: Math.random() * Math.PI * 2,
      // Random axis for rotation
      axis: new Vector3(
        MathUtils.randFloatSpread(2),
        MathUtils.randFloatSpread(2),
        MathUtils.randFloatSpread(2),
      ).normalize(),
      // Random scale for varied card sizes in globe
      scale: 0.7 + Math.random() * 0.6,
    }))
  }, [numCards])

  // Handler for when a card is selected
  const handleCardSelect = (cardId: number) => {
    const newSelectedId = cardId === selectedCardId ? null : cardId;
    setSelectedCardId(newSelectedId);
    
    // Notify parent component about selection state change
    if (onSelectionChange) {
      onSelectionChange(newSelectedId !== null);
    }
  }

  // Animate the group - reduced rotation speed
  useFrame((state) => {
    if (groupRef.current && !selectedCardId) {
      // Slower rotation of the entire deck for better performance
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      {cards.map((card) => (
        <Card 
          key={card.id} 
          card={card} 
          hovered={hovered} 
          expanded={expanded} 
          isSelected={card.id === selectedCardId}
          allCardsSelected={selectedCardId !== null}
          onSelect={handleCardSelect}
        />
      ))}
      
      {/* Information panel displayed when a card is selected */}
      {selectedCardId !== null && (
        <group position={[3, 0, 0]}>
          <mesh>
            <planeGeometry args={[4, 5]} />
            <meshStandardMaterial color="#f5f5dc" opacity={0.9} transparent />
          </mesh>
          <group position={[0, 0, 0.01]}>
            <InfoPanel cardId={selectedCardId} />
          </group>
        </group>
      )}
    </group>
  )
}

