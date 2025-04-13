import { ThreeElements } from '@react-three/fiber'
import { Vector3 } from 'three'

export interface Card {
  id: number;
  initialPosition: Vector3;
  rotation: number[];
  radius: number;
  speed: number;
  phase: number;
  axis: Vector3;
  scale: number;
  index?: number;  // Index for position calculation
  totalCards?: number;  // Total number of cards for positioning
}

declare global {
  namespace React {
    namespace JSX {
        interface IntrinsicElements extends ThreeElements {
        }
    }
  }
}