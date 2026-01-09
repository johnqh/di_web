# CLAUDE.md - AI Assistant Guide

This file provides guidance for AI assistants working with this repository.

## Project Overview

`@sudobility/di_web` is a TypeScript library providing web implementations of dependency injection services for Sudobility applications. It implements the interfaces defined in `@sudobility/di` with web-specific implementations.

**Package**: `@sudobility/di_web`
**Type**: ES Module (TypeScript)
**Framework**: React 18/19

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
    ├── info.web.ts       # WebInfoService implementation
    └── InfoBanner.tsx    # React banner component
tests/
└── ...                   # Vitest test files
dist/                     # Compiled output (auto-generated)
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
   - `InfoBanner` component
   - `useInfoBanner` hook
   - Banner state management

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
2. **Check `@sudobility/di`** - For interface definitions
3. **Follow existing patterns** - Match `info.web.ts` implementation style
4. **Test everything** - Run `bun run test` after changes
5. **Type safety** - Ensure implementations match DI interfaces

### Common Tasks

**Adding a new service**:
1. Create `src/<service>/<service>.web.ts` implementing the DI interface
2. Add React hook if needed: `src/<service>/use<Service>.ts`
3. Add component if needed: `src/<service>/<Service>Component.tsx`
4. Export all from `src/<service>/index.ts`
5. Add to main exports in `src/index.ts`

**Fixing type errors**:
1. Run `bun run typecheck` to see all errors
2. Ensure implementations match DI interface signatures
3. Check peer dependency types are installed

### Project Invariants

1. **Implement DI interfaces** - All services must implement `@sudobility/di` interfaces
2. **Web-only** - No React Native or Node.js specific code
3. **Peer dependencies** - Don't bundle dependencies, use peer deps
4. **ESM only** - Module type is ESM, no CommonJS
