# GOOSE-WebApp - AI Agent Development Guide

## Project Overview

GOOSE-WebApp is a Vue 3 web application designed for SEU undergraduates to manage workout records. It's a web interface for the GOOSE (GOOSE Opens workOut for SEU undErgraduates) project, providing users with tools to configure workout parameters and upload exercise data.

**Key Features:**
- User configuration management (token, route selection, datetime)
- Track/route selection and management
- Image upload functionality for start/finish photos
- Integration with backend API for workout record submission
- Responsive design with mobile-first approach

## Technology Stack

- **Frontend Framework:** Vue 3 with Composition API
- **Build Tool:** Vite 7.1.11
- **State Management:** Pinia 3.0.4
- **Routing:** Vue Router 4.6.3
- **Language:** TypeScript 5.9.0
- **Styling:** CSS3 with scoped component styles
- **Development Tools:** Vue DevTools, ESLint, Prettier

## Project Structure

```
src/
├── assets/           # Static assets (CSS, images)
├── components/       # Vue components
│   ├── ImageUploader.vue      # Image upload functionality
│   ├── TrackSelector.vue      # Route/track selection
│   ├── UploadWorkflow.vue     # Main upload workflow
│   └── UserConfigForm.vue     # User configuration form
├── router/          # Vue Router configuration
├── services/        # API service classes
├── stores/          # Pinia state management
│   ├── config.ts    # Configuration store
│   ├── route.ts     # Route management store
│   └── user.ts      # User data store
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── views/           # Page components
    └── HomeView.vue # Main application view

public/
├── config/          # Runtime configuration
│   └── headers.json # API request headers
├── boundaries/      # Geographic boundary data
├── tracks/          # Predefined track/route data
└── goose-logo.png   # Application logo
```

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server with hot reload
pnpm dev

# Production build with type checking
pnpm build

# Type checking only
pnpm type-check

# Linting and auto-fix
pnpm lint

# Code formatting
pnpm format

# Preview production build
pnpm preview
```

## Code Style Guidelines

### TypeScript Configuration
- Uses Vue's recommended TypeScript configuration
- Path aliases configured: `@/*` maps to `./src/*`
- Strict type checking enabled
- Vue SFC type support through `vue-tsc`

### ESLint Rules
- Vue 3 essential rules enforced
- TypeScript-specific linting
- Prettier integration for consistent formatting
- Ignores: `dist/**`, `dist-ssr/**`, `coverage/**`

### Prettier Configuration
- Semicolons: disabled
- Single quotes: enabled
- Print width: 100 characters
- JSON schema validation enabled

### Component Development
- Use Composition API with `<script setup lang="ts">`
- Scoped CSS for component-specific styling
- Props and emits should be properly typed
- Store usage through Pinia composables

## API Integration

The application integrates with a backend API for workout record management:

- **Base URL:** Configured in constants
- **Authentication:** Token-based via request headers
- **Request Headers:** Loaded from `/config/headers.json`
- **Rate Limiting:** Built-in request delays (3-8 seconds)
- **Endpoints:** Start record, finish record, image upload

## State Management

### Config Store (`stores/config.ts`)
- Manages application configuration
- Loads headers from external JSON file
- Handles loading states and errors

### User Store (`stores/user.ts`)
- Stores user authentication token
- Manages workout datetime and route selection
- Handles start/finish images
- Custom track configuration

### Route Store (`stores/route.ts`)
- Manages available routes/tracks
- Provides route selection functionality
- Handles route metadata

## Testing Strategy

Currently, the project does not have automated tests configured. Testing is done manually through:

1. **Development server** (`pnpm dev`) for local testing
2. **Preview server** (`pnpm preview`) for production build testing
3. **Type checking** (`pnpm type-check`) for TypeScript validation
4. **Linting** (`pnpm lint`) for code quality

## Deployment Process

1. **Build:** `pnpm build` creates production bundle in `dist/`
2. **Static Assets:** Includes public files (config, boundaries, tracks)
3. **Environment:** Node.js ^20.19.0 or >=22.12.0 required
4. **Serving:** Deploy `dist/` folder to static hosting service

## Security Considerations

- User tokens are stored in client-side state (Pinia)
- API headers contain sensitive information loaded from public config
- No server-side session management
- Client-side validation only
- Users responsible for their uploaded data (disclaimer in footer)

## Development Environment

### Recommended Setup
- **IDE:** VS Code with Vue (Official) extension
- **Browser:** Chrome/Firefox with Vue.js DevTools
- **Package Manager:** pnpm (preferred) or npm

### Browser DevTools Configuration
- Enable custom object formatters for better Vue debugging
- Vue DevTools extension for component inspection

## Dependencies

### Runtime Dependencies
- `vue`: ^3.5.22 - Core Vue framework
- `vue-router`: ^4.6.3 - Client-side routing
- `pinia`: ^3.0.4 - State management

### Development Dependencies
- `vite`: ^7.1.11 - Build tool and dev server
- `typescript`: ~5.9.0 - TypeScript compiler
- `vue-tsc`: ^3.1.1 - Vue TypeScript compiler
- `eslint`: ^9.37.0 - Code linting
- `prettier`: 3.6.2 - Code formatting
- `@vitejs/plugin-vue`: ^6.0.1 - Vue plugin for Vite

## License

GPL-3.0 License - Open source project with copyleft licensing.