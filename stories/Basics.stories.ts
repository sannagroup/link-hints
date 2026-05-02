import type { Meta, StoryObj } from '@storybook/html-vite';
import { createLinkHints, type LinkHintsHandle, type LinkHintsOptions } from '../src/index.js';

type Args = {
  activationKey: string;
  hintChars: string;
};

const meta: Meta<Args> = {
  title: 'Link Hints/Basics',
  argTypes: {
    activationKey: { control: 'text' },
    hintChars: { control: 'text' }
  },
  args: {
    activationKey: 'f',
    hintChars: 'sadfjklewcmpgh'
  }
};

export default meta;

const mountWithLib = (
  body: HTMLElement,
  args: Args,
  extraOptions: Partial<LinkHintsOptions> = {}
): HTMLElement => {
  const wrapper = document.createElement('div');
  wrapper.append(body);

  let handle: LinkHintsHandle | undefined;
  queueMicrotask(() => {
    handle = createLinkHints({
      activationKey: args.activationKey,
      hintChars: args.hintChars,
      ...extraOptions
    });
  });

  const observer = new MutationObserver(() => {
    if (!wrapper.isConnected && handle) {
      handle.dispose();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return wrapper;
};

const styled = (markup: string): HTMLElement => {
  const root = document.createElement('div');
  root.style.cssText =
    'font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem;';
  root.innerHTML = `
    <p style="color:#525252">Press <kbd>f</kbd> to activate. Type a label to click. <kbd>Esc</kbd> to cancel.</p>
    ${markup}
  `;
  return root;
};

type Story = StoryObj<Args>;

export const LinksAndButtons: Story = {
  render: (args) =>
    mountWithLib(
      styled(`
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem">
          <button>Save</button>
          <button>Cancel</button>
          <a href="#nope">Open docs</a>
          <a href="#about">About</a>
          <button>Delete</button>
          <button>Share</button>
        </div>
      `),
      args
    )
};

export const FormHeavy: Story = {
  render: (args) =>
    mountWithLib(
      styled(`
        <form style="display:grid;gap:.75rem">
          <input placeholder="Name" />
          <input type="email" placeholder="Email" />
          <select><option>One</option><option>Two</option></select>
          <textarea placeholder="Notes"></textarea>
          <label><input type="checkbox" /> I agree</label>
          <label><input type="radio" name="r" /> A</label>
          <label><input type="radio" name="r" /> B</label>
          <button type="submit">Submit</button>
        </form>
      `),
      args
    )
};

export const PinnedHints: Story = {
  render: (args) =>
    mountWithLib(
      styled(`
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem">
          <button data-hint="OP">Pinned to OP</button>
          <button data-hint="SR">Pinned to SR</button>
          <button>Auto-assigned</button>
          <button>Auto-assigned</button>
          <button>Auto-assigned</button>
        </div>
      `),
      args
    )
};

export const ScrollableContainer: Story = {
  render: (args) =>
    mountWithLib(
      styled(`
        <div style="height:300px;overflow:auto;border:1px solid #d4d4d4;padding:.75rem">
          <div style="display:grid;gap:.5rem">
            ${Array.from({ length: 30 }, (_, i) => `<button>Item ${i + 1}</button>`).join('')}
          </div>
        </div>
      `),
      args
    )
};

export const DynamicDom: Story = {
  render: (args) => {
    const root = styled(`
      <div>
        <button id="add">Add button</button>
        <div id="bucket" style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-top:1rem"></div>
      </div>
    `);
    queueMicrotask(() => {
      const add = root.querySelector<HTMLButtonElement>('#add');
      const bucket = root.querySelector<HTMLDivElement>('#bucket');
      let count = 0;
      add?.addEventListener('click', () => {
        const button = document.createElement('button');
        count += 1;
        button.textContent = `Dynamic ${count}`;
        bucket?.append(button);
      });
    });
    return mountWithLib(root, args);
  }
};

export const ExcludedSubtree: Story = {
  render: (args) =>
    mountWithLib(
      styled(`
        <div style="display:grid;gap:.75rem">
          <button>Visible</button>
          <button>Visible</button>
          <div data-no-hints style="padding:.75rem;border:1px dashed #d4d4d4">
            <p style="color:#737373;margin:0 0 .5rem">Buttons in this box are excluded via <code>isClickable</code>.</p>
            <button>Excluded</button>
            <button>Excluded</button>
          </div>
        </div>
      `),
      args,
      {
        isClickable: (element) => {
          if (element.closest('[data-no-hints]')) return false;
          return undefined;
        }
      }
    )
};
