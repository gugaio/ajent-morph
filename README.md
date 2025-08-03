# Frontable

Live design system editor with natural language commands.

## Installation

```bash
npm install
npm run build
```

## Usage

### Browser Console
Copy and paste the generated `dist/design-system-agent.min.js` into browser console.

### Script Tag
```html
<script src="design-system-agent.min.js"></script>
```

### NPM Module
```javascript
import DesignSystemAgent from 'design-system-agent';

const agent = new DesignSystemAgent({
  activationSequence: 'frontable'
});
```

## Activation

Type `frontable` anywhere on the page to activate the agent.

## Commands

- 🎨 "Mudar cor para [cor]" - Change element color
- 📏 "Aumentar/diminuir espaçamento" - Adjust spacing
- 🔵 "Deixar mais arredondado" - Round corners
- 📝 "Texto maior/menor" - Change font size

## Development

```bash
npm run dev    # Development build with watch
npm run serve  # Start dev server
npm run test   # Run tests
npm run lint   # Lint code
```

## Build

```bash
npm run build
```

Generates:
- `dist/design-system-agent.min.js` - Minified production build
- `dist/design-system-agent.css` - Extracted styles
- `dist/demo.html` - Demo page
