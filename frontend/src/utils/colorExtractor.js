/**
 * Extract dominant color from an image URL
 * Uses canvas to analyze pixel data and return the most common color
 */
export const extractDominantColor = (imageUrl) => {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      resolve('#C4A484'); // Default light brown color
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Resize to smaller dimensions for performance
        const size = 50;
        canvas.width = size;
        canvas.height = size;
        
        ctx.drawImage(img, 0, 0, size, size);
        
        // Get pixel data
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        // Sample pixels (every 4th pixel for performance)
        const colorMap = {};
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          // Skip transparent pixels
          if (a < 128) continue;
          
          // Quantize colors to reduce variations
          const quantizedR = Math.round(r / 32) * 32;
          const quantizedG = Math.round(g / 32) * 32;
          const quantizedB = Math.round(b / 32) * 32;
          
          const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
          colorMap[colorKey] = (colorMap[colorKey] || 0) + 1;
        }
        
        // Find most frequent color
        let maxCount = 0;
        let dominantColor = '#C4A484'; // Default light brown
        
        for (const [colorKey, count] of Object.entries(colorMap)) {
          if (count > maxCount) {
            maxCount = count;
            const [r, g, b] = colorKey.split(',').map(Number);
            dominantColor = `rgb(${r}, ${g}, ${b})`;
          }
        }
        
        resolve(dominantColor);
      } catch (error) {
        console.error('Color extraction error:', error);
        resolve('#C4A484'); // Fallback to light brown
      }
    };
    
    img.onerror = () => {
      console.error('Failed to load image for color extraction');
      resolve('#C4A484'); // Fallback to light brown
    };
    
    img.src = imageUrl;
  });
};

/**
 * Convert RGB to Hex
 */
export const rgbToHex = (rgb) => {
  if (rgb.startsWith('#')) return rgb;
  
  const result = rgb.match(/\d+/g);
  if (!result) return '#C4A484';
  
  const r = parseInt(result[0]);
  const g = parseInt(result[1]);
  const b = parseInt(result[2]);
  
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

/**
 * Determine if color is dark or light
 * Used for choosing text color (white for dark backgrounds, black for light)
 */
export const isColorDark = (color) => {
  const rgb = color.match(/\d+/g);
  if (!rgb) return false;
  
  const r = parseInt(rgb[0]);
  const g = parseInt(rgb[1]);
  const b = parseInt(rgb[2]);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
};
