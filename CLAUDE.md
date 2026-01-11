# CLAUDE.md - AI Assistant Guide

This file provides comprehensive guidance for AI assistants (Claude Code, GitHub Copilot, Cursor, etc.) when working with this repository.

## Project Overview

`@sudobility/di_web` is a TypeScript library providing web implementations of dependency injection services for Sudobility applications. It implements the interfaces defined in `@sudobility/di` with web-specific implementations using browser APIs and React.

**Package**: `@sudobility/di_web`
**Version**: 0.1.50
**Type**: ES Module (TypeScript)
**Framework**: React 18/19, TypeScript 5.9+

## Package Manager

**This project uses Bun as the package manager.** Always use `bun` commands instead of `npm`:

```bash
# Install dependencies
bun install

# Run any script
bun run <script-name>
```

## Development Commands

```bash
# Build the library
bun run build

# Watch mode compilation
bun run build:watch

# Type checking
bun run typecheck

# Clean dist directory
bun run clean

# Testing
bun run test           # Run tests once
bun run test:watch     # Watch mode
bun run test:coverage  # Coverage report
bun run test:ci        # CI-friendly run

# Code Quality
bun run lint           # Run ESLint
bun run lint:fix       # Auto-fix ESLint issues
bun run format         # Format code with Prettier
```

## Project Structure

```
src/
├── index.ts              # Main entry point, exports all services
└── info/                 # Info service and components
    ├── index.ts          # Info module exports
    ├── info.web.ts       # WebInfoService class, singleton management, BannerState type
    └── InfoBanner.tsx    # InfoBanner component and useInfoBanner hook
tests/
└── index.test.ts         # Vitest test file (15 tests)
dist/                     # Compiled output (auto-generated)
```

## Exports Reference

All exports from `@sudobility/di_web`:

```typescript
// Service class
export { WebInfoService } from '@sudobility/di_web';

// Factory and singleton management
export {
  createWebInfoService,   // Create a new instance
  initializeInfoService,  // Initialize singleton (also registers with @sudobility/di)
  getInfoService,         // Get singleton instance
  resetInfoService,       // Reset singleton (for testing)
} from '@sudobility/di_web';

// React integration
export {
  InfoBanner,             // Auto-connected banner component
  useInfoBanner,          // Hook to subscribe to banner state
} from '@sudobility/di_web';

// Types
export type {
  BannerState,            // { isVisible, title, description, variant, duration? }
  BannerStateListener,    // (state: BannerState) => void
} from '@sudobility/di_web';
```

## Architecture

### Design Philosophy

- **Interface Implementation**: Implements interfaces from `@sudobility/di`
- **Web-Specific**: Uses web APIs (localStorage, browser notifications, etc.)
- **React Integration**: Provides React hooks and components
- **Singleton Pattern**: Services are typically singletons for app-wide use

### Dependencies

**Peer Dependencies** (required by consuming apps):
- `@sudobility/di` - DI interface definitions
- `@sudobility/types` - Shared type definitions
- `@sudobility/components` - UI components
- `react` - React 18 or 19

### Current Services

1. **WebInfoService** - Banner and info display service
   - Implements `InfoInterface` from `@sudobility/di`
   - Uses observable pattern for React subscription
   - Auto-dismisses banners after timeout (default 5s)
   - `InfoBanner` component - auto-connected to singleton
   - `useInfoBanner` hook - for custom banner implementations

## Usage Examples

### Basic Setup

```typescript
// App.tsx - Initialize once at app startup
import { initializeInfoService, InfoBanner } from '@sudobility/di_web';

// Initialize the service singleton
initializeInfoService();

function App() {
  return (
    <>
      <InfoBanner />  {/* Render once in app root */}
      <YourApp />
    </>
  );
}
```

### Showing Banners

```typescript
// Anywhere in your app
import { getInfoService } from '@sudobility/di_web';
// OR use the DI package (both work after initialization):
import { getInfoService } from '@sudobility/di';
import { InfoType } from '@sudobility/types';

// Show a success banner (auto-dismisses after 5s)
getInfoService().show('Success', 'Data saved successfully', InfoType.SUCCESS);

// Show an error banner (auto-dismisses after 10s)
getInfoService().show('Error', 'Something went wrong', InfoType.ERROR, 10000);

// Show a banner that doesn't auto-dismiss (interval = 0)
getInfoService().show('Warning', 'Please review', InfoType.WARNING, 0);

// Manually dismiss
getInfoService().dismiss();
```

### Custom Banner Component

```typescript
import { useInfoBanner } from '@sudobility/di_web';
import { Banner } from '@sudobility/components';

function CustomBanner() {
  const { state, dismiss } = useInfoBanner();

  if (!state.isVisible) return null;

  return (
    <Banner
      isVisible={state.isVisible}
      onDismiss={dismiss}
      title={state.title}
      description={state.description}
      variant={state.variant}
    />
  );
}
```

## Development Guidelines

### Adding New Services

1. Create implementation file in `src/<service>/`
2. Create React hooks/components if needed
3. Export from `src/<service>/index.ts`
4. Export from main `src/index.ts`
5. Add tests in `tests/`
6. Run `bun run typecheck && bun run test && bun run build`

### Testing Strategy

- Use Vitest for testing
- Test service methods and React components
- Mock browser APIs when necessary
- Maintain test coverage

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier
- **Linting**: ESLint with TypeScript support
- **Components**: Functional React components with TypeScript interfaces

## AI Assistant Instructions

### Quick Start

1. **Read this file first** - Contains project context
2. **Check `@sudobility/di`** - For interface definitions being implemented
3. **Follow existing patterns** - Match `info.web.ts` implementation style
4. **Test everything** - Run `bun run test` after changes
5. **Type safety** - Ensure implementations match DI interfaces exactly

### Common Tasks

**Adding a new service**:
1. Create `src/<service>/<service>.web.ts` implementing the DI interface
2. Define state interface (like `BannerState`)
3. Implement observable pattern with `subscribe()`, `getState()`, `listeners`
4. Add React hook: Include in same file or separate `use<Service>.ts`
5. Add component if needed: `<Service>Component.tsx`
6. Export all from `src/<service>/index.ts`
7. Add to main exports in `src/index.ts`
8. Add tests in `tests/`
9. Verify: `bun run typecheck && bun run test && bun run build`

**Service implementation template**:
```typescript
import { type SomeInterface, initializeSomeService } from '@sudobility/di';

export interface SomeState {
  // State shape
}

export type SomeStateListener = (state: SomeState) => void;

export class WebSomeService implements SomeInterface {
  private state: SomeState = { /* initial state */ };
  private listeners: Set<SomeStateListener> = new Set();

  subscribe(listener: SomeStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): SomeState {
    return this.state;
  }

  private setState(newState: SomeState): void {
    this.state = newState;
    this.listeners.forEach((l) => l(this.state));
  }

  // Implement interface methods...
}

let instance: WebSomeService | null = null;

export function initializeSomeService(service?: WebSomeService): void {
  if (instance) return;
  instance = service ?? new WebSomeService();
  initializeSomeService(instance); // Register with @sudobility/di
}

export function getSomeService(): WebSomeService {
  if (!instance) throw new Error('Service not initialized');
  return instance;
}
```

**Fixing type errors**:
1. Run `bun run typecheck` to see all errors
2. Ensure implementations match DI interface signatures exactly
3. Check that `@sudobility/di` types are installed in devDependencies

### Project Invariants

1. **Implement DI interfaces** - All services must implement `@sudobility/di` interfaces
2. **Register with DI** - `initialize*Service()` must also call `@sudobility/di`'s initializer
3. **Observable pattern** - Use `subscribe()`/`listeners` pattern for React integration
4. **Web-only** - No React Native or Node.js specific code
5. **Peer dependencies** - Don't bundle dependencies, use peer deps
6. **ESM only** - Module type is ESM, no CommonJS

### AI Context Markers

The source files use these markers for AI comprehension:

```typescript
/**
 * @ai-context Brief description of purpose
 * @ai-pattern Design pattern being used
 * @ai-usage How to use this code
 */
```

When adding new code, include these markers to help future AI assistants understand the codebase.
