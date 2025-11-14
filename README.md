# @sudobility/di_web

Web implementations of dependency injection services for 0xmail.box.

## Installation

```bash
npm install @sudobility/di_web @sudobility/di @sudobility/types
```

## Usage

```typescript
import { webNetworkClient, webStorageService, webAnalyticsService } from '@sudobility/di_web';

// Use the pre-configured singleton instances
const response = await webNetworkClient.get('https://api.example.com/data');
```

## Services

- **Network Client**: Axios-based HTTP client with retry logic
- **Storage Service**: LocalStorage-based persistence
- **Analytics Service**: Web analytics tracking
- **Notification Service**: Browser notification support
- **Navigation Service**: Web navigation helpers
- **Theme Service**: Dark/light theme management
- **Persistence Service**: IndexedDB-based storage
- **Firebase Service**: Firebase initialization for web

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Lint
npm run lint
```

## License

MIT
