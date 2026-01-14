// apps/docs/.vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme';
import { h } from 'vue';

import type { Theme } from 'vitepress';

// Import custom styles
import './fonts.css';
import './style.css';

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // Use default layout with custom styles applied via CSS
    });
  },
  enhanceApp({ app: _app, router: _router, siteData: _siteData }) {
    // No custom app enhancements needed for this phase
  }
} satisfies Theme;
