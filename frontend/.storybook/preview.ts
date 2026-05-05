import type { Preview } from '@storybook/react';
import '../app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: '#f8fafc' },
        { name: 'white', value: '#ffffff' },
        { name: 'dark', value: '#0f172a' },
      ],
    },
    a11y: {
      // Fail builds on serious or critical a11y violations once the suite
      // is stable. For now leave as advisory.
      element: '#storybook-root',
      manual: false,
    },
  },
};

export default preview;
