# Visual Context Feature for Ajent Morph

## Overview

The Visual Context feature allows users to include screenshots of selected elements when chatting with the Ajent Morph system. This provides enhanced context to the LLM for better design suggestions and more accurate responses.

## How to Use

### Basic Usage

1. Select one or more elements on the page using the element selector
2. Type your message in the chat, followed by `#image`
3. The system will automatically capture a screenshot of the selected elements
4. The screenshot will be displayed in your message and sent to the LLM for analysis

### Examples

```
"Improve the design of this button #image"
"What colors would work better here? #image"
"#image how can I make this more accessible?"
"Make this card more modern looking #image"
```

## Features

### Visual Feedback
- Screenshots are displayed directly in chat messages
- Click on any screenshot to view it in full-screen modal
- Visual indicators show when images are included
- Progress indicators during screenshot capture

### Performance Optimizations
- **Caching**: Screenshots are cached to avoid redundant captures
- **Debouncing**: Rapid successive captures are prevented
- **Compression**: Images are optimized for LLM transmission
- **Mobile Support**: Automatic optimizations for mobile devices

### Configuration
The system is highly configurable through `VisualContextConfig.js`:

```javascript
// Example configuration updates
visualContextManager.updateConfig({
  capture: {
    maxCanvasWidth: 400,  // Increase canvas size
    imageQuality: 0.9     // Higher quality images
  },
  performance: {
    enableCache: false,   // Disable caching
    captureDebounce: 1000 // Longer debounce time
  }
});
```

## Technical Details

### Architecture
- **VisualContextManager**: Core class handling screenshot capture and processing
- **ChatInterface**: Updated to display visual messages with canvas elements
- **CommandProcessor**: Enhanced to pass visual context to LLM
- **Frontable**: Orchestrates the visual capture flow

### Dependencies
- `html2canvas`: For capturing DOM element screenshots
- Native HTML5 Canvas API for image processing

### Browser Support
- Modern browsers with Canvas support
- Mobile browsers (with performance optimizations)
- WebGL acceleration when available

## Configuration Options

### Capture Settings
- `maxCanvasWidth/Height`: Maximum dimensions for captured images
- `imageQuality`: JPEG/PNG quality (0.1-1.0)
- `scale`: Render scale for html2canvas
- `backgroundColor`: Background color for transparent elements

### Performance Settings
- `enableCache`: Enable screenshot caching
- `cacheTimeout`: Cache expiration time (ms)
- `captureDebounce`: Debounce time for captures (ms)
- `llmCompression`: Settings for LLM image transmission

### UI Settings
- `showInChat`: Display screenshots in chat
- `enableModal`: Allow full-screen image viewing
- `enableHover`: Hover effects on images
- `animationDuration`: Animation timing

### Feature Flags
- `enableMultiElementCapture`: Support for multiple element screenshots
- `enableHighlightOnCapture`: Highlight elements during capture
- `enableProgressIndicator`: Show capture progress
- `enableErrorRecovery`: Automatic error handling

## Debug Mode

Enable debug mode for development and troubleshooting:

```javascript
visualContextManager.enableDebug('debug');
```

Debug mode provides:
- Detailed console logging
- Performance timing information
- Cache statistics
- Error details

## Performance Metrics

Access performance information:

```javascript
const metrics = visualContextManager.getPerformanceMetrics();
console.log('Cache hit rate:', metrics.cacheHitRate);
console.log('Average capture time:', metrics.averageCaptureTime);
```

## Error Handling

The system includes robust error handling:
- Graceful degradation when screenshots fail
- Automatic fallback to text-only messages
- User-friendly error messages
- Recovery mechanisms for common issues

## Security Considerations

- Screenshots are processed client-side only
- No sensitive data is transmitted unless explicitly captured
- Images are compressed and optimized before LLM transmission
- CORS policies are respected for external content

## Future Enhancements

Planned features for future versions:
- Batch screenshot capture
- Advanced image annotations
- OCR for text extraction
- Element boundary highlighting
- Custom capture regions
- Export functionality

## Troubleshooting

### Common Issues

1. **Screenshots not capturing**
   - Check if html2canvas is loaded
   - Verify element selection
   - Check console for errors

2. **Poor image quality**
   - Increase `imageQuality` setting
   - Adjust `scale` parameter
   - Check element visibility

3. **Performance issues**
   - Enable caching
   - Reduce image dimensions
   - Increase debounce time

4. **Mobile problems**
   - Use mobile-optimized settings
   - Reduce image sizes
   - Check device memory

### Debug Commands

```javascript
// Enable debug mode
window.visualContextManager?.enableDebug('debug');

// Check performance
console.log(window.visualContextManager?.getPerformanceMetrics());

// Clear caches
window.visualContextManager?.cleanup();
```

## API Reference

### VisualContextManager Methods

- `shouldIncludeVisualContext(message)`: Check if message requests visual context
- `cleanUserMessage(message)`: Remove #image command from message
- `captureElementScreenshot(element)`: Capture single element
- `captureMultipleElements(elements)`: Capture multiple elements
- `updateConfig(config)`: Update configuration
- `enableDebug(level)`: Enable debug mode
- `cleanup()`: Clean up resources

### Configuration Object

See `VisualContextConfig.js` for complete configuration options and defaults.