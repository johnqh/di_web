/**
 * Info service exports
 */

// Service and types
export {
  WebInfoService,
  createWebInfoService,
  initializeInfoService,
  getInfoService,
  resetInfoService,
  type BannerState,
  type BannerStateListener,
} from './info.web.js';

// React components
export { InfoBanner, useInfoBanner } from './InfoBanner.js';
