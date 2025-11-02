class StyleValidator {

  validate(styles) { 
        
    const parsedStyles = typeof styles === 'string' ? JSON.parse(styles) : styles;
    const validCSSProperties = new Set([
      'display', 'position', 'top', 'right', 'bottom', 'left',
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
      'color', 'backgroundColor', 'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
      'borderColor', 'borderWidth', 'borderStyle', 'borderRadius',
      'background', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat', 'backgroundAttachment',
      'boxShadow', 'textShadow', 'textAlign', 'textDecoration', 'textTransform',
      'flexDirection', 'justifyContent', 'alignItems', 'alignSelf', 'flex', 'flexGrow', 'flexShrink',
      'gridTemplateColumns', 'gridTemplateRows', 'gridGap', 'gap',
      'transform', 'transition', 'animation', 'opacity', 'visibility', 'overflow',
      'cursor', 'userSelect', 'pointerEvents', 'zIndex',
      // WebKit specific properties for gradients and text effects
      'WebkitBackgroundClip', 'webkitBackgroundClip', '-webkit-background-clip',
      'WebkitTextFillColor', 'webkitTextFillColor', '-webkit-text-fill-color',
      'WebkitTextStroke', 'webkitTextStroke', '-webkit-text-stroke',
      'WebkitTextStrokeColor', 'webkitTextStrokeColor', '-webkit-text-stroke-color',
      'WebkitTextStrokeWidth', 'webkitTextStrokeWidth', '-webkit-text-stroke-width',
      // Additional background properties
      'backgroundClip', 'background-clip',
      // Mozilla specific
      'MozBackgroundClip', 'mozBackgroundClip', '-moz-background-clip'
    ]);

    const errors = [];
    const validStyles = {};

    Object.entries(parsedStyles).forEach(([prop, value]) => {
      if (validCSSProperties.has(prop)) {
        validStyles[prop] = value;
      } else {
        errors.push(`Invalid CSS property: ${prop}`);
      }
    });

    return {
      valid: validStyles,
      errors,
      isValid: errors.length === 0
    };

  }
}

export default StyleValidator;