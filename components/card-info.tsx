"use client"

import React from 'react'
import { Text } from "@react-three/drei"

// Card suits and values for the info panel
const suits = ["♠", "♥", "♦", "♣"]
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]

// Information panel component props
interface InfoPanelProps {
  cardId: number;
}

// Information panel component
export function InfoPanel({ cardId }: InfoPanelProps) {
  const suit = suits[Math.floor(cardId / 13)]
  const value = values[cardId % 13]
  
  return (
    <group>
      {/* Title */}
      <Text position={[0, 2, 0]} fontSize={0.3} color="#000000" anchorX="center" anchorY="middle">
        {value} of {suit === "♠" ? "Spades" : suit === "♥" ? "Hearts" : suit === "♦" ? "Diamonds" : "Clubs"}
      </Text>
      
      {/* Lorem ipsum text */}
      <Text 
        position={[0, 0, 0]} 
        fontSize={0.15} 
        color="#333333" 
        anchorX="center" 
        anchorY="middle"
        maxWidth={3.5}
        textAlign="left"
      >
        Dear Reader,
        
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        
        Each card holds a story, a meaning, a path to understanding. This one speaks of journeys yet to come and wisdom gained along the way.
        
        May this card bring you fortune and insight.
        
        Regards,
        The Keeper of Cards
      </Text>
    </group>
  )
} 