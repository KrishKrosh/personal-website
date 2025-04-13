"use client"

import { useRef, useMemo, useState, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import { MathUtils, Vector3, Group } from "three"
import Card from "./card"
import { useIsMobile } from "@/hooks/use-mobile"

// Define props interface for CardDeck
interface CardDeckProps {
  hovered: boolean;
  expanded: boolean;
  onSelectionChange?: (isSelected: boolean, cardId?: number | null) => void;
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
  const isMobile = useIsMobile()
  
  // Define specific cards to include (aces, kings, queens, jacks, eights, and threes)
  const specificCardValues = [0, 2, 7, 10, 11, 12]; // Indices for A, 3, 8, J, Q, K in the values array
  
  // Calculate the total number of cards (6 values × 4 suits = 24 cards)
  const numCards = specificCardValues.length * 4; // 24 cards total
  
  // State for selected card
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null)
  
  // State to track info panel position
  const [infoPanelPosition, setInfoPanelPosition] = useState<[number, number, number]>([2.5, 0, 0])
  
  // Update info panel position based on window size
  useEffect(() => {
    const updatePanelPosition = () => {
      const width = window.innerWidth;
      // Adjust panel position based on screen size
      if (width < 640) { // Mobile
        setInfoPanelPosition([0, -2.5, 0]); // Below the card
      } else {
        setInfoPanelPosition([2.5, 0, 0]); // To the right of the card
      }
    };
    
    // Set initial position
    updatePanelPosition();
    
    // Add resize listener
    window.addEventListener('resize', updatePanelPosition);
    
    // Cleanup
    return () => window.removeEventListener('resize', updatePanelPosition);
  }, []);
  
  // Create card data with specific cards
  const cards = useMemo<CardData[]>(() => {
    const cardData: CardData[] = [];
    
    // Generate cards for each suit and specific value
    for (let suitIndex = 0; suitIndex < 4; suitIndex++) {
      for (let valueIdx = 0; valueIdx < specificCardValues.length; valueIdx++) {
        // Calculate the actual card ID that would correspond to this suit and value
        const cardId = suitIndex * 13 + specificCardValues[valueIdx];
        
        cardData.push({
          id: cardId,
          // Initial position is stacked with slight offset
          initialPosition: new Vector3(
            MathUtils.randFloatSpread(0.1),
            cardData.length * 0.01 - numCards * 0.005,
            MathUtils.randFloatSpread(0.1),
          ),
          // Random rotation for when expanded
          rotation: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2],
          // Radius for the globe formation
          radius: isMobile ? 3 + Math.random() * 1.5 : 4 + Math.random() * 1.5, // Range [3, 4] - Reduced for denser packing
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
          // Scale
          scale: 0.8 + Math.random() * 0.3,
        });
      }
    }
    
    return cardData;
  }, [numCards]);
  
  // Handler for when a card is selected
  const handleCardSelect = (cardId: number) => {
    const newSelectedId = cardId === selectedCardId ? null : cardId;
    setSelectedCardId(newSelectedId);
    
    // Reset the group rotation when a card is selected
    if (newSelectedId !== null && groupRef.current) {
      groupRef.current.rotation.set(0, 0, 0);
    }
    
    // Notify parent component about selection state change
    if (onSelectionChange) {
      onSelectionChange(newSelectedId !== null, newSelectedId);
    }
  }

  // Animation progress for smooth transitions
  const [selectionAnimProgress, setSelectionAnimProgress] = useState(0)
  
  // Animate the selection transition
  useFrame((state, delta) => {
    // Use delta time for smooth animations regardless of frame rate
    const frameFactor = Math.min(delta * 60, 2)
    
    if (selectedCardId !== null) {
      setSelectionAnimProgress(prev => Math.min(prev + 0.1 * frameFactor, 1))
      
      // Ensure the group rotation stays at zero when a card is selected
      if (groupRef.current) {
        groupRef.current.rotation.set(0, 0, 0);
      }
    } else {
      setSelectionAnimProgress(prev => Math.max(prev - 0.1 * frameFactor, 0))
      
      // Only rotate the group when no card is selected
      if (groupRef.current) {
        groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      }
    }
  })

  // Determine which cards to render based on selection state
  const cardsToRender = selectedCardId === null 
    ? cards // Render all cards when none is selected
    : cards.filter(card => card.id === selectedCardId); // Only render the selected card

  return (
    <group ref={groupRef}>
      {cardsToRender.map((card, index) => (
        <Card 
          key={card.id} 
          card={{
            ...card,
            index: index,
            totalCards: cardsToRender.length,
            // Apply a larger scale when the card is selected
            scale: selectedCardId === card.id ? card.scale * 1.25 : card.scale
          }} 
          hovered={hovered} 
          expanded={expanded} 
          isSelected={card.id === selectedCardId}
          allCardsSelected={selectedCardId !== null}
          onSelect={handleCardSelect}
        />
      ))}
    </group>
  )
}

