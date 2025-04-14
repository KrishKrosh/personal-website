# Card Deck Animation

This project demonstrates an interactive 3D card deck animation using React, Three.js, and React Three Fiber.

## Card Back Texture

To customize the back of the cards with an artistic, intricate design:

1. Download a high-quality playing card back texture or create your own
2. Save it as `card-back.png` in the `/public/images/` directory
3. The texture should ideally have the card aspect ratio (7:10 or 2.5:3.5) for best results
4. For best results, use a high-resolution image (at least 1024x1024 pixels)
5. The entire texture will be displayed with properly rounded corners automatically

### Important Notes About the Card Back Texture

- The texture will automatically be scaled to fill the entire card back
- Corners will be automatically rounded using the same algorithm as the card face
- A subtle gold tint will be applied to give it a metallic look
- If your texture has transparency, it will be respected
- If no texture is found, a fallback gold metallic design will be used

### Recommended Texture Resources

Here are some places where you can find high-quality card back textures:

- [Freepik](https://www.freepik.com/search?format=search&query=playing%20card%20back)
- [Shutterstock](https://www.shutterstock.com/search/playing-card-back)
- [Adobe Stock](https://stock.adobe.com/search?k=playing+card+back)
- [Unsplash](https://unsplash.com/s/photos/pattern) (for more artistic/abstract patterns)
- [VectorStock](https://www.vectorstock.com/royalty-free-vectors/back-of-playing-card-pattern-vectors)

## Development

To run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. 