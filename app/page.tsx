"use client"

import { Suspense } from "react"
import CardDeckScene from "@/components/card-deck-scene"
import LoadingScreen from "@/components/loading-screen"

export default function Home() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-zinc-800">
      {/* <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <h1 className="text-white text-4xl md:text-6xl font-serif tracking-wider opacity-80">pick a card. any card.</h1>
      </div> */}
      <Suspense fallback={<LoadingScreen />}>
        <CardDeckScene />
      </Suspense>
    </main>
  )
}

