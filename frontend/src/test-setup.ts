// jsdom doesn't implement ResizeObserver, which Vuetify components use to measure themselves.
// Nothing in these tests depends on layout, so an observer that never fires is enough.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
