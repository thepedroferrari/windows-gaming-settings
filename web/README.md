# RockTune Web — Loadout Builder for Windows Gaming

A modern, interactive web application that generates personalized PowerShell scripts to optimize Windows for gaming. Built with Deno, Vite, Svelte 5, and TypeScript.

## 🎯 Project Goals

**RockTune** helps gamers create custom Windows optimization scripts by:

- **Hardware-aware optimization** — Detects CPU (AMD X3D, AMD, Intel) and GPU (NVIDIA, AMD, Intel) to apply relevant tweaks
- **Software installation** — Integrates with `winget` to install gaming essentials (Steam, Discord, OBS, etc.)
- **Performance tuning** — Applies registry tweaks, power plans, timer resolution, and other gaming-focused optimizations
- **Privacy controls** — Optional privacy hardening tiers (safe → moderate → aggressive)
- **User-friendly interface** — Visual card-based selection with presets (Pro Gamer, Streaming, Balanced, Minimal)
- **Transparency & review** — Preflight checks, audit panel, and diff/preview before export

## 🛠️ Tech Stack

- **Runtime**: [Deno](https://deno.com/) — Modern JavaScript/TypeScript runtime
- **Build Tool**: [Vite](https://vitejs.dev/) — Fast development and production builds
- **UI**: [Svelte 5](https://svelte.dev/) — Component-based UI with runes
- **Language**: TypeScript — Type-safe code with strict mode
- **Schema validation**: [Zod](https://zod.dev/) — Runtime validation for catalog/profile data
- **Linting/Formatting**: [Biome](https://biomejs.dev/) — Fast formatter and linter
- **Tooling**: Knip (dead code), PurgeCSS (style audits)
- **Key npm deps**:
  - `diff` (npm) — For code diff visualization in audit panel

## 🌐 Browser Support

- Chromium-based browsers (Chrome, Edge). Firefox is not supported due to modern CSS features like `oklch`, `color-mix`, and `@scope`.

## 📁 Project Structure

```
web/
├── src/
│   ├── main.ts              # Entry point, initializes app
│   ├── RootApp.svelte       # App shell + layout
│   ├── lib/                 # State, data, script generation
│   │   ├── state.svelte.ts  # Svelte runes store
│   │   ├── optimizations.ts # Optimization data
│   │   ├── presets.ts       # Preset logic
│   │   └── types.ts         # Shared types
│   ├── components/          # Svelte UI + scoped styles
│   ├── styles/              # Tokens, layout, utilities
│   ├── schemas.ts           # Zod schemas
│   └── utils/               # Download, checksum, helpers
├── scripts/                 # Build + audit scripts (purgecss, catalog audit)
├── public/                  # catalog + icons
├── index.html               # Main HTML entry point
├── style.css                # Global styles + layer imports
├── deno.json                # Deno configuration & tasks
├── vite.config.ts           # Vite build configuration
├── biome.json               # Biome linter/formatter config
└── knip.json                # Dead-code detection config
```

## 🚀 Getting Started

### Prerequisites

- **Deno 2.6.3+** — Install from [deno.land](https://deno.land/) or run:
  ```bash
  curl -fsSL https://deno.land/install.sh | sh
  ```

### Development

1. **Start the dev server**:
   ```bash
   cd web
   deno task dev
   ```

2. **Open in browser**: http://localhost:9010/

3. **Make changes** — Vite will hot-reload automatically

### Available Tasks

```bash
# Development server
deno task dev

# Typecheck + Svelte diagnostics
deno task check

# Lint / format
deno task lint
deno task format

# Dead-code + unused exports
deno task knip

# CSS audit (unused selectors)
deno task purge:report

# Full validation (lint + check + knip + build)
deno task validate

# Production build / preview
deno task build
deno task preview

# Tests
deno task test
```

## 🧰 Tooling Notes

- `web/package.json` exists only to support knip's Svelte parsing; runtime/build still use Deno with npm specifiers.

## 🏗️ Build & Deployment

### Local Build

```bash
deno task build
```

Output goes to `web/dist/` — static files ready for deployment.

### Netlify Deployment

The project is configured for Netlify with automatic Deno installation:

- **Build command**: `curl -fsSL https://deno.land/install.sh | sh && ~/.deno/bin/deno task build`
- **Publish directory**: `web/dist`
- **Configuration**: See `netlify.toml` in project root

Netlify will:
1. Install Deno automatically
2. Run the build task
3. Deploy the `dist` folder

## 🎨 Features

### Software Selection

- **Card-based UI** — Hover to see description and action
- **Category filtering** — Filter by launcher, gaming, streaming, utility, etc.
- **Search** — Real-time search across names, descriptions, categories
- **Grid/List view** — Toggle between card grid and compact list
- **Presets** — Quick-load configurations:
  - **Pro Gamer** — Maximum FPS, all performance opts
  - **Streaming** — Balanced for gaming + OBS
  - **Balanced** — Safe defaults for most users
  - **Minimal** — Essential only

### Script Generation

- **Hardware-aware** — Adapts optimizations based on CPU/GPU selection
- **Live preview** — See generated PowerShell script in real-time
- **Diff view** — Compare script changes as you modify selections
- **Preflight checks** — Warns about missing drivers/settings before download
- **Download** — Export as `.ps1` file ready to run

### Profile Management

- **Save profiles** — Export your configuration as JSON
- **Load profiles** — Import saved configurations
- **Version tracking** — Profiles include version metadata

### Transparency & Trust

- **Audit panel** — Live diff view of the script as you toggle options
- **Checksum** — SHA256 hash for verifying downloads
- **No tracking** — Client-only generation with explicit transparency cues

## 🔧 Architecture Decisions

### Why Deno?

- **No Node.js** — Modern runtime with built-in TypeScript support
- **Security** — Explicit permissions model
- **Fast** — Built on V8 with Rust tooling
- **Native npm support** — Uses npm specifiers; `node_modules` may be created via `nodeModulesDir: auto`

### Why Vite?

- **Fast HMR** — Instant hot module replacement
- **Optimized builds** — Tree-shaking, code splitting, minification
- **TypeScript support** — Native TS compilation without extra config

### Why Svelte 5?

- **Component clarity** — Keeps UI structure close to styles and behavior
- **Reactivity** — Runes-based state (`$state`, `$derived`) for predictable updates
- **Lean runtime** — Small runtime overhead with fast renders

### Why TypeScript?

- **Type safety** — Catches errors at compile time
- **Better DX** — Autocomplete, refactoring, documentation
- **Maintainability** — Self-documenting code with types

## 🐛 Troubleshooting

### Lockfile Version Mismatch

If you see:
```
error: Failed reading lockfile ... Unsupported lockfile version '5'
```

**Solution**: Delete `deno.lock` and let it regenerate:
```bash
rm deno.lock
deno task dev
```

### Port Already in Use

If port 9010 is taken, Vite will automatically use the next available port.

### Build Errors

1. **Check Deno version**: `deno --version` (should be 2.6.3+)
2. **Clear cache**: `rm -rf ~/.deno/cache` (if needed)
3. **Reinstall dependencies**: Delete `deno.lock` and rebuild

## 📝 Code Style

- **Formatting**: Biome (2 spaces, single quotes, semicolons as needed)
- **Linting**: Biome recommended rules
- **TypeScript**: Strict mode enabled
- **Naming**: PascalCase for types/interfaces, camelCase for functions/variables

Run `deno task format` before committing.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `deno task validate`
5. Test locally with `deno task dev`
6. Submit a pull request

## 📄 License

See [LICENSE](../LICENSE) in the project root.

## 🔗 Links

- **Repository**: https://github.com/thepedroferrari/rocktune
- **Main Script**: See `gaming-pc-setup.ps1` in project root
- **Documentation**: See `README.md` in project root

---

**Built with ❤️ for the gaming community**
