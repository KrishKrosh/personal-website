# Card Deck Animation

Hi! I believe that experiences on the web are fun, so I wanted to turn my website into one. This is a threejs website that turns key points in my life into a deck of playing cards. There are a ton of easter eggs so I hope you enjoy :)

## How It Works

This project is built using **React** and **Three.js** (via `@react-three/fiber`), creating an interactive 3D card deck experience in the browser.

- **3D Scene & Animation:**  
  The main scene ([components/card-deck-scene.tsx](components/card-deck-scene.tsx)) uses Three.js to render a dynamic environment, including custom background shaders, subtle light effects, and animated text.
- **Card Deck Logic:**  
  The deck ([components/card-deck.tsx](components/card-deck.tsx)) consists of selected cards (A, 3, 8, J, Q, K from each suit), each mapped to a key life event. Cards are animated and arranged in a globe-like formation, with smooth transitions and interactivity.
- **UI Components:**  
  The card UI ([components/ui/card.tsx](components/ui/card.tsx)) provides reusable, styled card components for consistent design and easy customization.

## Features

- Interactive 3D card deck with smooth animations
- Custom shader backgrounds and light effects for a mystical atmosphere
- Responsive design for desktop and mobile
- Easter eggs and hidden interactions throughout the experience
- Info panels and dynamic transitions based on user actions
- Debug mode to view cards in development

## Project Structure

- **components/card-deck-scene.tsx**  
  Sets up the Three.js scene, background, lighting, and camera controls. Handles animation, user interaction, and overlays (like mystical text).
- **components/card-deck.tsx**  
  Manages the logic and rendering of the card deck, including card arrangement, animation, selection, and info panel positioning.
- **components/ui/card.tsx**  
  Contains styled React components for card UI (header, title, description, content, footer), used throughout the deck for consistency.

## Getting Started

1. **Install dependencies:**
   ```bash
   bun install
   ```
2. **Run the development server:**
   ```bash
   bun run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) to view the site.

## Customization & Contributing

Feel free to fork, customize, or contribute! The project is designed to be modular and easy to extend with new cards, animations, or features.

## Credits

- Built with [React](https://react.dev/) and [Three.js](https://threejs.org/) via [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
- Special thanks to everyone who inspired the stories in these cards!

## License

MIT License (idk what this means)
