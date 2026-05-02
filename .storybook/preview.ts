import type { Preview } from '@storybook/html-vite';
import '../src/style/style.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } }
  }
};

export default preview;
