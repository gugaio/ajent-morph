# Frontable

Live design system editor with natural language commands.

## Installation

```bash
npm install
npm run build
```

## Usage

### Browser Console
Copy and paste the generated `dist/frontable.min.js` into browser console.

### Script Tag
```html
<script src="frontable.min.js"></script>
```

### NPM Module
```javascript
import Frontable from 'frontable';

const agent = new Frontable({
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
- `dist/frontable.min.js` - Minified production build
- `dist/frontable.css` - Extracted styles
- `dist/demo.html` - Demo page
