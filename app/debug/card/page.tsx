"use client"

import { useState, useEffect } from 'react'
import { Vector3 } from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'

// Import necessary components
import Card from '@/components/card'
import { Card as CardType } from '@/types'

// Simple card wrapper for display
function CardWrapper({ cardId }: { cardId: number }) {
  const [rotation, setRotation] = useState([0, 0, 0]);
  
  // Add gentle rotation animation
  useEffect(() => {
    let animationId: number;
    let startTime = Date.now();
    
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      setRotation([
        0,
        elapsed * 0.2, // gentle Y-axis rotation
        0
      ]);
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);
  
  // Set expanded to true and hovered to true to ensure the card is visible
  const cardData: CardType = {
    id: cardId,
    initialPosition: new Vector3(0, 0, 0),
    rotation: [0, 0, 0],
    radius: 3,
    speed: 0.5,
    phase: 0,
    axis: new Vector3(0, 1, 0),
    scale: 1.5, // Increased scale for better visibility
    index: 0,
    totalCards: 1
  }
  
  // The isHovered state is crucial for making the card's face visible
  // The card should be in expanded state and we want to see the front face
  const [isHovered, setIsHovered] = useState(true);
  
  useEffect(() => {
    console.log(`Rendering card with ID: ${cardId}`);
  }, [cardId]);
  
  return (
    <group position={[0, 0, 0]} rotation={[rotation[0], rotation[1], rotation[2]]}>
      <Card
        key={cardId}
        card={cardData}
        hovered={isHovered} 
        expanded={true}
        isSelected={true} // Setting to true to ensure the card is fully visible
        allCardsSelected={false}
        onSelect={() => {}}
      />
    </group>
  )
}

// Debug scene with proper camera settings
function CardScene({ cardId }: { cardId: number }) {
  return (
    <Canvas 
      camera={{ position: [0, 0, 5], fov: 45 }}
      style={{ background: "linear-gradient(to bottom, #1a1a2e, #16213e)" }}
    >
      {/* Environment light for better rendering */}
      <Environment preset="studio" />
      
      {/* Scene background - flat plane behind card */}
      <mesh position={[0, 0, -2]} rotation={[0, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial color="#16213e" />
      </mesh>
      
      {/* Ambient light */}
      <ambientLight intensity={1.0} />
      
      {/* Main directional light */}
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={2.0} 
        castShadow 
      />
      
      {/* Golden accent light */}
      <pointLight position={[-5, 3, -5]} intensity={1.5} color="#ffd700" />
      
      {/* Add a central point light to better illuminate the card */}
      <pointLight position={[0, 0, 3]} intensity={1.2} color="white" />
      
      {/* Card */}
      <CardWrapper cardId={cardId} />
      
      {/* Controls for rotating and zooming the view */}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={10}
      />
    </Canvas>
  )
}

export default function CardDebugPage() {
  // Available cards with images
  const availableCards = [
    { id: 10, name: "Jack of Hearts" },
    { id: 11, name: "Queen of Hearts" },
    { id: 12, name: "King of Hearts" },
    { id: 25, name: "King of Spades" }
  ]
  
  // State to manage the card selection
  const [selectedCardId, setSelectedCardId] = useState(10) // Default to Jack of Hearts
  
  // Calculate card value and suit for display
  const suits = ["♥", "♠", "♦", "♣"] 
  const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
  const suitIndex = Math.floor(selectedCardId / 13)
  const valueIndex = selectedCardId % 13
  const suit = suits[suitIndex] || suits[0]
  const value = values[valueIndex] || values[0]

  // Function to check if this card has an image
  const hasCustomImage = () => {
    return availableCards.some(card => card.id === selectedCardId)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-slate-800 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold">Card Viewer</h1>
        <div className="flex flex-wrap gap-4 mt-4">
          <div>
            <label className="block text-sm mb-1">Select a Card:</label>
            <div className="flex flex-wrap gap-2">
              {availableCards.map(card => (
                <button
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)}
                  className={`px-3 py-2 rounded transition-colors ${
                    selectedCardId === card.id
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-slate-600 hover:bg-slate-700'
                  }`}
                >
                  {card.name}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm mb-1">Or enter card ID:</label>
            <input
              type="number"
              min="0"
              max="51"
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(Number(e.target.value))}
              className="bg-slate-700 rounded px-3 py-2 text-white w-20"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* 3D Card View */}
        <div className="flex-1 relative overflow-hidden" style={{ minHeight: "600px" }}>
          <div className="w-full h-full absolute inset-0">
            <CardScene cardId={selectedCardId} />
          </div>
        </div>

        {/* Info Panel */}
        <div className="w-80 bg-slate-100 p-4 overflow-auto">
          <h2 className="text-xl font-bold mb-4">Card Information</h2>
          
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Card Details:</h3>
            <ul className="space-y-1 text-sm">
              <li><strong>ID:</strong> {selectedCardId}</li>
              <li><strong>Value:</strong> {value}</li>
              <li><strong>Suit:</strong> {suit}</li>
              <li><strong>Has Custom Image:</strong> {hasCustomImage() ? 'Yes' : 'No'}</li>
            </ul>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold mb-2">Available Custom Images:</h3>
            <ul className="space-y-1 text-sm">
              <li>Jack of Hearts (ID: 10)</li>
              <li>Queen of Hearts (ID: 11)</li>
              <li>King of Hearts (ID: 12)</li>
              <li>King of Spades (ID: 25)</li>
            </ul>
          </div>
          
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Card ID Reference:</h3>
            <p className="text-xs mb-2">IDs are calculated as: (suit index * 13) + value index</p>
            <div className="flex flex-col gap-1 text-xs bg-gray-100 p-2 rounded">
              <div>Hearts: IDs 0-12</div>
              <div>Spades: IDs 13-25</div>
              <div>Diamonds: IDs 26-38</div>
              <div>Clubs: IDs 39-51</div>
              <hr className="my-1 border-gray-300" />
              <div>A = 0, 2 = 1, 3 = 2, ... J = 10, Q = 11, K = 12</div>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Test All Cards:</h3>
            <div className="grid grid-cols-4 gap-1 text-xs">
              {Array.from({ length: 52 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedCardId(i)}
                  className={`p-1 rounded ${
                    selectedCardId === i
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 