import '@testing-library/jest-dom/vitest';

// jsdom does not implement window.matchMedia. Astryx components (e.g.
// SideNavItem's hover-intent handling) call it via a useMediaQuery hook, so
// without a stub any test rendering those components throws
// "window.matchMedia is not a function".
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
