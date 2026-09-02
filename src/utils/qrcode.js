// Generate QR code text that can be used by users
export function generateTableQRCode(tableNumber) {
  return `table_${tableNumber}`
}

// Generate QR code text with session (optional)
export function generateTableSessionQRCode(tableNumber, sessionNumber = 1) {
  return `table_${tableNumber}-${sessionNumber}`
}

// Generate QR code URL for external QR code service
export function generateQRCodeImageUrl(text, size = 300) {
  // Using qr-server.com free API
  const encodedText = encodeURIComponent(text)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}`
}

// Get deep link URL for user order app
export function getUserOrderUrl(tableNumber) {
  const qrCode = generateTableQRCode(tableNumber)
  // User order subdomain
  const baseUrl = 'https://userorder.hdfdapp.vercel.app'
  return `${baseUrl}?code=${encodeURIComponent(qrCode)}`
}

// Canvas-based QR code generation (fallback)
export function generateQRCodeCanvas(text, canvasId = 'qr-canvas') {
  try {
    // Import QR code library if available
    // For now, return the image URL from qr-server
    return generateQRCodeImageUrl(text, 300)
  } catch (error) {
    console.error('Error generating QR code:', error)
    return null
  }
}
