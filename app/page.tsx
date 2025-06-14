"use client"

import { Canvas } from '@react-three/fiber'
import AppLoader from "@/components/AppLoader"

export default function Home() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-black/80">
      <AppLoader />
    </main>
  )
}

