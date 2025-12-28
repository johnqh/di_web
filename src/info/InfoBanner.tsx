/**
 * React components for InfoInterface integration
 *
 * Provides useInfoBanner hook and InfoBanner component that
 * automatically subscribe to the WebInfoService singleton.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Banner } from '@sudobility/components';
import { getInfoService, type BannerState } from './info.web.js';

/**
 * Hook to subscribe to the info service banner state
 *
 * @returns Current banner state and dismiss function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, dismiss } = useInfoBanner();
 *
 *   return (
 *     <Banner
 *       isVisible={state.isVisible}
 *       onDismiss={dismiss}
 *       title={state.title}
 *       description={state.description}
 *       variant={state.variant}
 *       duration={state.duration}
 *     />
 *   );
 * }
 * ```
 */
export function useInfoBanner(): {
  state: BannerState;
  dismiss: () => void;
} {
  const service = getInfoService();
  const [state, setState] = useState<BannerState>(service.getState());

  useEffect(() => {
    return service.subscribe(setState);
  }, [service]);

  const dismiss = useCallback(() => {
    service.dismiss();
  }, [service]);

  return { state, dismiss };
}

/**
 * Banner component that automatically connects to the info service singleton
 *
 * Just render this component once in your app root to display info banners.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <>
 *       <InfoBanner />
 *       <YourApp />
 *     </>
 *   );
 * }
 * ```
 */
export function InfoBanner(): React.ReactElement | null {
  const { state, dismiss } = useInfoBanner();

  if (!state.isVisible) {
    return null;
  }

  return (
    <Banner
      isVisible={state.isVisible}
      onDismiss={dismiss}
      title={state.title}
      description={state.description}
      variant={state.variant}
      duration={0} // We handle auto-dismiss in the service
    />
  );
}
