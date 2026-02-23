# Improvement Plans for @sudobility/di_web

## Priority 1 - High Impact

### 1. Add JSDoc to Service Worker Utilities
- `register.ts`, `vite-plugin-service-worker.ts`, and `sw/index.ts` lack `@fileoverview`, `@param`, `@returns` annotations
- Document the Vite plugin options and behavior
- Add `@example` blocks for `registerServiceWorker` usage

### 2. Expand Test Coverage
- Currently only 14 tests for WebInfoService
- Add tests for `initializeWebApp()` orchestrator with various option combinations
- Add tests for service worker registration/unregistration
- Test the Vite plugin file emission behavior

### 3. Add Error Handling to Service Worker Registration
- `registerServiceWorker` should handle more edge cases (navigator.serviceWorker undefined, HTTPS-only, etc.)
- Add retry logic for failed registrations
- Emit events on registration state changes

## Priority 2 - Medium Impact

### 4. Make Service Worker Configurable
- The `sw.js` has hardcoded cache names and strategies
- Allow consumers to configure cache strategies, max age, and URL patterns
- Support custom offline fallback pages

### 5. Add RevenueCat Initialization Error Recovery
- `initializeWebApp()` catches RevenueCat init failures silently
- Add retry logic or surface the error for consumer handling
- Consider making RevenueCat initialization lazy (on first subscription check)

### 6. Improve Firebase Messaging Worker
- `firebase-messaging-sw.js` has a hardcoded Firebase config placeholder
- Add documentation on how consumers should configure it
- Consider generating the worker with actual config at build time

## Priority 3 - Nice to Have

### 7. Add Storybook for InfoBanner
- Create visual stories for different banner states (success, error, warning, info)
- Test auto-dismiss timing and manual dismiss behavior

### 8. Add Bundle Size Monitoring
- Track the size impact of service worker files
- Ensure tree-shaking works correctly for unused exports
- Consider dynamic imports for the service worker module

### 9. Add Health Check Endpoint to Service Worker
- Allow apps to verify service worker is active and responding
- Report cache sizes and staleness
