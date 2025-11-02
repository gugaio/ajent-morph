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
    const colorMap = {
      'azul': '#3B82F6',
      'vermelho': '#EF4444', 
      'verde': '#10B981',
      'amarelo': '#F59E0B',
      'roxo': '#8B5CF6',
      'rosa': '#EC4899',
      'cinza': '#6B7280',
      'preto': '#000000',
      'branco': '#FFFFFF',
      'blue': '#3B82F6',
      'red': '#EF4444',
      'green': '#10B981',
      'yellow': '#F59E0B',
      'purple': '#8B5CF6',
      'pink': '#EC4899',
      'gray': '#6B7280',
      'black': '#000000',
      'white': '#FFFFFF',
      'laranja': '#F97316',
      'orange': '#F97316'
    };

    if (typeof color === 'string') {
      return colorMap[color.toLowerCase()] || color;
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