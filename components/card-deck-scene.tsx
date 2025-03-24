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

export default function CardDeckScene() {
  const [hovered, setHovered] = useState<boolean>(false)
  const [expanded, setExpanded] = useState<boolean>(false)
  const [contextLost, setContextLost] = useState<boolean>(false)
  const [cardSelected, setCardSelected] = useState<boolean>(false)

  // Handle mouse movement over the canvas
  const handlePointerMove = (): void => {
    if (!hovered) {
      setHovered(true)

      // After a delay, trigger the expanded state
      setTimeout(() => {
        setExpanded(true)
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

  // Handle card selection state change
  const handleCardSelectionChange = (isSelected: boolean): void => {
    setCardSelected(isSelected)
  }

  return (
    <div className="h-screen w-full cursor-pointer" onPointerMove={handlePointerMove}>
      {contextLost ? (
        <div className="h-full w-full flex items-center justify-center bg-black text-white">
          <p>WebGL context lost. Attempting to recover...</p>
        </div>
      ) : (
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

  useFrame(() => {
    if (expanded && !cardSelected) {
      const now = Date.now()
      // Only update camera position at specified intervals to reduce CPU usage
      if (now - lastUpdateTime.current > updateInterval) {
        // Much gentler camera movement - just a subtle drift
        // We'll keep Z mostly fixed to prevent background issues
        const time = Date.now() * 0.00005 // Slower movement
        
        // Start from initial position and apply very gentle movement
        camera.position.x = initialCameraPosition.current.x + Math.sin(time) * 2
        camera.position.y = initialCameraPosition.current.y + Math.sin(time * 1.3) * 0.5
        // Keep z-distance more stable to prevent background issues
        camera.position.z = initialCameraPosition.current.z + 0.5 * Math.sin(time * 0.7)
        
        camera.lookAt(0, 0, 0)
        lastUpdateTime.current = now
      }
    }
  })

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

