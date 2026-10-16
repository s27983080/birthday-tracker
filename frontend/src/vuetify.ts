import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';

/**
 * Components are imported on demand by vite-plugin-vuetify, so only this plugin needs creating.
 * Icons are SVG paths from @mdi/js, imported where they're used, so unused ones aren't bundled.
 */
export function createAppVuetify() {
  return createVuetify({
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
    theme: {
      // Follows the operating system's light/dark setting.
      defaultTheme: 'system',
      themes: {
        light: { colors: { primary: '#c2185b' } },
        dark: { colors: { primary: '#f48fb1' } },
      },
    },
    defaults: {
      VTextField: { variant: 'outlined' },
      VSelect: { variant: 'outlined' },
    },
  });
}
