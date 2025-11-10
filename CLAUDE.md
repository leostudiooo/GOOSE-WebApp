# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

# Lint and fix code
pnpm lint

# Format code
pnpm format
```

## Architecture Overview

This is a Vue 3 web application for GOOSE (运动打卡系统) that provides a terminal UI (TUI) style interface for sports activity tracking. The application uses TypeScript, Pinia for state management, and implements a comprehensive custom track drawing system.

### Core Application Structure

**State Management (Pinia Stores):**
- `userStore` - User configuration, images, custom tracks with localStorage persistence
- `configStore` - Headers and API configuration loaded from `/public/config/`
- `routeStore` - Available sports venues/routes loaded from `/public/config/routes.json`

**Key Components:**
- `PRTSTracker` - Interactive canvas-based track drawing tool with device pixel ratio handling
- `TrackSelector` - Route selection and custom track management with drag-drop file upload
- `ImageUploader` - Drag-and-drop image upload with preview
- `UserConfigForm` - User settings and configuration

### Custom Track System

The application implements a sophisticated custom track drawing and management system:

**Track Data Flow:**
1. User draws track in PRTSTracker canvas → PathPoint[] format
2. Completed tracks auto-save to localStorage (`goose_prts_path_points` key)
3. TrackSelector auto-loads saved tracks on page refresh
4. Tracks can be exported as JSON or imported from files
5. Custom tracks integrate with existing route system

**LocalStorage Keys:**
- `goose_user_config` - User configuration and settings
- `goose_prts_path_points` - PRTS-drawn track data with metadata

### Data Sources

**Static Configuration Files:**
- `/public/config/headers.json` - API headers configuration
- `/public/config/routes.json` - Available sports venues
- `/public/boundaries/*.json` - Venue boundary coordinates
- `/public/tracks/*.json` - Predefined track data

### TUI Design System

The application uses a consistent Terminal UI aesthetic:
- Monospace fonts (`Courier New`) throughout
- CSS variables for theming (`--tui-*` and `--color-*`)
- Dashed borders for upload areas
- Compact button styles with hover transitions
- Dark/light mode support via CSS custom properties

### Component Interactions

**Track Management Workflow:**
- TrackSelector manages route selection and custom track state
- PRTSTracker handles interactive drawing and editing
- UserStore coordinates between file uploads, localStorage, and track data
- Canvas rendering accounts for device pixel ratio and proper coordinate mapping

**File Upload System:**
- ImageUploader supports drag-drop for start/finish images
- TrackSelector supports JSON track file imports
- Both store files in userStore and display appropriate UI states

### Important Implementation Notes

- Canvas operations in PRTSTracker must handle device pixel ratio properly
- Track editing preserves existing route selection (doesn't auto-change venue)
- Coordinate conversion functions maintain proper aspect ratios for different boundaries
- All localStorage operations include error handling for storage quota issues
- Component state transitions use Vue Transitions for smooth UX