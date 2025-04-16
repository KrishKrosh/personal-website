let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  async redirects() {
    return [
      // Fallback for non-existent routes to redirect to notes.krishkrosh.com
      {
        source: '/:path((?!api/|_next/static|_next/image|favicon.ico|.*\.png$).*)', // Match all paths except known Next.js paths and static files
        destination: 'https://notes.krishkrosh.com/:path*', // Redirect to the external site preserving the path
        permanent: false, // This is not a permanent redirect
        basePath: false, // Don't apply basePath to this redirect
      },
      // ... any other redirects ...
    ];
  },
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig
