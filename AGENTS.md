# AGENTS.md

This file provides guidance to AI coding agents operating in this repository.

## Project Overview

GOOSE WebApp (运动打卡系统) — a Vue 3 sports activity tracking application with a Terminal UI aesthetic. Uses TypeScript, Pinia state management, and Vite.

## Development Commands

```bash
pnpm install           # Install dependencies
pnpm dev               # Dev server with hot reload
pnpm build             # Production build with type checking
pnpm build-only        # Build without type checking
pnpm type-check        # TypeScript type checking only
pnpm lint              # ESLint with auto-fix
pnpm format            # Prettier formatting (src/)
pnpm preview           # Preview production build
```

**No test framework is configured.** Do not create test files unless explicitly asked.

## Code Style

### Formatting (Prettier)

- No semicolons
- Single quotes
- Max line width: 100 characters
- 2-space indentation
- Final newline, no trailing whitespace

### TypeScript & Vue

- Use `<script setup lang="ts">` for all Vue components
- Use Composition API exclusively — no Options API
- Import types with `import type { ... }` from `@/types`
- Use `@/` path alias for src imports (configured in tsconfig)
- Export Pinia stores using `defineStore('name', () => { ... })` (setup syntax)

### Naming Conventions

- **Files**: camelCase for `.ts` files; PascalCase for `.vue` files
- **Components**: PascalCase (e.g., `PRTSTracker.vue`, `TrackSelector.vue`)
- **Pinia stores**: camelCase with `use` prefix (e.g., `useUserStore`)
- **Interfaces**: PascalCase (e.g., `StartRecord`, `TrackPoint`)
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE

### Imports

- Vue/pinia imports first, then local types, then utilities
- Use `import type` for type-only imports
- Avoid default exports except in router (`router/index.ts`)

### Error Handling

- Wrap localStorage operations in try/catch
- Throw `Error` with descriptive messages for API failures
- Use `console.error` for non-fatal errors (storage issues)

## Architecture

### Key Directories

- `src/stores/` — Pinia stores (user, config, route)
- `src/services/` — API client and upload services
- `src/types/` — TypeScript interfaces (`index.ts`, `constants.ts`)
- `src/utils/` — Utility functions (haversine, boundary loading, privacy masking)
- `src/components/` — Vue components
- `src/views/` — Page-level components
- `public/config/` — Static JSON configuration files
- `public/boundaries/` — Venue boundary data
- `public/tracks/` — Predefined track data

### Data Flow

1. Static config loaded from `/public/config/` via configStore/routeStore
2. User data persisted to localStorage (`goose_user_config` key)
3. Track data persisted separately (`goose_prts_path_points` key)
4. API calls via `APIClient` class in `src/services/api.ts`

### TUI Design System

- Monospace fonts (`Courier New`)
- CSS variables: `--tui-*` and `--color-*`
- Dashed borders for interactive areas
- Dark/light mode via CSS custom properties

## Important Notes

- Canvas operations must handle `devicePixelRatio`
- All localStorage writes include quota error handling
- Data processing uses raw (unmasked) data; masking only at display time
- The app uses PWA (vite-plugin-pwa) with service worker caching
