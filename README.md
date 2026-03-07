# @sudobility/di_web

Web-specific implementations of dependency injection services for Sudobility applications. Implements interfaces from `@sudobility/di` using browser APIs and React, plus a shared service worker with a Vite plugin.

## Installation

```bash
bun install @sudobility/di_web @sudobility/di @sudobility/types @sudobility/components
```

Optional peer dependency for service worker plugin:
```bash
bun install vite  # Vite 5, 6, or 7
```

## Usage

### App Initialization

```typescript
import { initializeWebApp } from '@sudobility/di_web';

await initializeWebApp({
  firebaseConfig: { apiKey: '...', projectId: '...' },
  registerServiceWorker: true,
});
```

### Info Banner (Toast Notifications)

```typescript
import { getInfoService, InfoBanner } from '@sudobility/di_web';
import { InfoType } from '@sudobility/types';

// Show notifications from anywhere
getInfoService().show('Saved', 'Changes saved successfully', InfoType.SUCCESS);
getInfoService().show('Error', 'Something went wrong', InfoType.ERROR, 10000);

// Render once in app root
function App() {
  return (<><AppContent /><InfoBanner /></>);
}
```

### Service Worker (Vite Plugin)

```typescript
// vite.config.ts
import { serviceWorkerPlugin } from '@sudobility/di_web/vite';

export default {
  plugins: [
    serviceWorkerPlugin({ includeFirebaseMessaging: true }),
  ],
};
```

Caching strategies: Cache First (static assets, images), Network First (HTML), Stale While Revalidate (locale files).

## Services

| Service | Purpose |
|---------|---------|
| `WebInfoService` | Observable banner/toast notifications with auto-dismiss |
| `InfoBanner` | Drop-in React component for rendering toasts |
| `initializeWebApp` | Orchestrator for all DI service initialization |
| `serviceWorkerPlugin` | Vite plugin for service worker build and dev |
| `registerServiceWorker` | Production service worker registration |

## Development

```bash
bun install
bun run build          # Compile (tsc + copy SW files)
bun run build:watch    # Watch mode
bun run typecheck      # TypeScript check
bun run test           # Run tests (Vitest, jsdom)
bun run test:coverage  # With coverage report
bun run lint           # ESLint
bun run format         # Prettier
```

## License

BUSL-1.1
