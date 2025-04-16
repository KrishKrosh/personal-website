import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Krish Shah',
  description: 'A personal website, a magic trick, and a walk into the most important parts of my life. Pick a card, any card.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body>{children}</body>
    </html>
  )
}
