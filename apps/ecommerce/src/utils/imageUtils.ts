import sharp from 'sharp'

const generateLogo = async (width, height, fontSize, filename) => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#FF9900;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#00A3A3;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#gradient)" />
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" 
            font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">
        eShoppe
      </text>
    </svg>
  `

  await sharp(Buffer.from(svg)).png().toFile(filename)

  console.log(`Generated ${filename}`)
}

// Generate app icon (1024x1024 for app stores, can be scaled down)
generateLogo(1024, 1024, 200, 'eshoppe-app-icon.png').then(() => {
  // Generate header logo (assume 600x150 for a wide header)
  generateLogo(600, 150, 72, 'eshoppe-header-logo.png').then(() => {
    console.log('Logo generation complete!')
  })
})
