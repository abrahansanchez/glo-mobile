const Analytics = {
  trackEvent: (name, props = {}) => {
    if (__DEV__) {
      console.log(`[Analytics] event: ${name}`, props);
    }
    // Placeholder: integrate with real analytics provider
  },
  trackError: (err, ctx = {}) => {
    try {
      if (__DEV__) console.log("[Analytics] error:", err?.message || err, ctx);
      // Placeholder: send to external error tracker
    } catch (e) {}
  },
};

export default Analytics;
