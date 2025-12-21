# Icon System

This directory contains custom SVG icons for software that doesn't have official logos on Simple Icons CDN.

## Design Guidelines

All icons follow these standards:

### Technical Specs
- **Format**: SVG
- **ViewBox**: `0 0 48 48` (standard)
- **Stroke Width**: `2.5px` (primary), `2px` (secondary details)
- **Colors**: Use `currentColor` for theme adaptation
- **File Size**: Keep under 2KB

### Visual Style
- **Minimal & Clean**: Simple, recognizable shapes
- **Consistent Stroke**: Use consistent stroke widths throughout
- **No Text** (except when text is the brand, e.g., "7z", "fb2k")
- **Meaningful Symbols**: Icons should represent the app's function

### Color Usage
```svg
<!-- Primary elements -->
fill="currentColor"
stroke="currentColor"

<!-- Accents/highlights -->
opacity="0.3" to "0.8"

<!-- Specific colors (use sparingly) -->
#ff4444 (red), #44ff44 (green), #4444ff (blue)
```

## Icon Categories

### Utilities (15 icons)
Disk analyzers, file managers, system tools

### Monitoring (11 icons)
Hardware monitors, benchmarking, temperature tools

### Media (3 icons)
Audio/video players, music managers

### Streaming (4 icons)
OBS overlays, mixers, capture tools

### Gaming/Launchers (1 icon)
Game library managers

### RGB (3 icons)
RGB control software

### Runtimes (3 icons)
Framework runtimes (DirectX, Java, etc.)

### Benchmarks (3 icons)
Performance testing tools

## Fallback System

The app uses a multi-tier fallback:
1. **Local SVG** (`icons/*.svg`)
2. **Simple Icons CDN** (58 apps)
3. **Emoji** (if defined in catalog)
4. **Category Icon** (generic SVG based on category)

## Adding New Icons

1. Create SVG file: `icons/appname.svg`
2. Follow design guidelines above
3. Update catalog.json:
   ```json
   "appname": {
     "icon": "icons/appname.svg",
     ...
   }
   ```
4. Test in browser

## Optimization

SVGs are optimized for:
- Small file size (500B-1.2KB)
- Fast loading with `loading="lazy"`
- Accessibility with proper `alt` and `aria-label`
- Automatic fallback on load errors
