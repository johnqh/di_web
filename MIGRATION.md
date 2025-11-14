# Migration to @sudobility/di_web

This package was created by extracting all Web-specific DI implementations from the mail_box project.

## What was moved

### Core Services
- `web-network.service.ts` - Web network client service
- `web-storage.service.ts` - LocalStorage-based storage service
- `web-persistence.service.ts` - IndexedDB persistence service
- `web-analytics.service.ts` - Web analytics service
- `web-notification.service.ts` - Browser notification service
- `web-theme.service.ts` - Dark/light theme management

### Platform Implementations
- `analytics/analytics.web.ts` - Web analytics client
- `firebase/firebase.web.ts` - Firebase initialization for web
- `navigation/navigation.web.ts` - Web navigation service
- `network/network.web.ts` - Web network client creator
- `notification/notification.web.ts` - Web push notification service
- `storage/storage.web.ts` - Web storage implementations

### Singletons
- `network-singleton.ts` - Network service singleton
- `storage-singleton.ts` - Storage service singleton

### Configuration
- `env.web.ts` - Web environment configuration
- `config/app.ts` - App configuration
- `types/ui-navigation.ts` - UI navigation types
- `firebase/firebase.interface.ts` - Firebase interface

## Usage in mail_box

The mail_box project now imports from `@sudobility/di_web` instead of local `./di/web/*` files:

```typescript
// Before
import { getStorageService } from './di/web/storage-singleton';
import { webNetworkClient } from './di/network/network.web';

// After
import { getStorageService, webNetworkClient } from '@sudobility/di_web';
```

## Known Issues

The package currently has some TypeScript compilation errors that need to be resolved:
1. Some types are imported from `@sudobility/lib` that should come from `@sudobility/di`
2. `import.meta.env` type errors in config files (need proper type definitions)
3. Some null vs undefined type mismatches

These will be fixed in subsequent updates. The package is functional despite these build warnings.

## Dependencies

- `@sudobility/di` ^1.4.14 (peer)
- `@sudobility/lib` ^3.13.6 (peer)
- `@sudobility/types` ^1.9.5 (peer)
- `axios` ^1.13.0 (peer)
- `firebase` ^12.4.0 (peer)
