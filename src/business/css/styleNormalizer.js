class StyleNormalizer {

  normalize(styles) {
    const normalized = {};

    Object.entries(styles).forEach(([prop, value]) => {
      // Normalize color values
      if (prop === 'color' || prop === 'backgroundColor' || prop === 'borderColor') {
        normalized[prop] = this.normalizeColor(value);
      }
      // Normalize size values
      else if (
        prop.includes('size') || 
                prop.includes('width') || 
                prop.includes('height') || 
                prop.includes('margin') || 
                prop.includes('padding') || 
                prop === 'borderRadius'
      ) {
        normalized[prop] = this.normalizeSize(value);
      }
      else {
        normalized[prop] = value;
      }
    });

    return normalized;
  }

  // Helper method to normalize color values
  normalizeColor(color) {
    // Example: Convert named colors to lowercase
    if (typeof color === 'string') {
      return color.toLowerCase();
    }
    return color;
  }

  // Helper method to normalize size values
  normalizeSize(size) {
    // Example: Ensure size values have 'px' if they are numbers
    if (typeof size === 'number') {
      return `${size}px`;
    }
    return size;
  }
}

export default StyleNormalizer;