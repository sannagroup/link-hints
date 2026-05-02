import type { Meta, StoryObj } from '@storybook/html-vite';
import {
  createLinkHints,
  type LinkHintsHandle,
  type LinkHintsOptions,
  type LinkHintsState
} from '../src/index.js';

type Args = Record<string, never>;

const meta: Meta<Args> = {
  title: 'Link Hints/Advanced',
  parameters: {
    docs: {
      description: {
        component:
          'Tricky scenarios: multiple instances, scoped roots, custom onActivate, live state, weird clickables, off-screen elements, and programmatic activation.'
      }
    }
  }
};

export default meta;

const shell = (markup: string): HTMLElement => {
  const root = document.createElement('div');
  root.style.cssText =
    'font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem;';
  root.innerHTML = markup;
  return root;
};

const withLifecycle = (
  root: HTMLElement,
  setup: (root: HTMLElement) => LinkHintsHandle | LinkHintsHandle[]
): HTMLElement => {
  let handles: LinkHintsHandle[] = [];
  queueMicrotask(() => {
    const result = setup(root);
    handles = Array.isArray(result) ? result : [result];
  });

  const observer = new MutationObserver(() => {
    if (!root.isConnected && handles.length > 0) {
      handles.forEach((handle) => handle.dispose());
      handles = [];
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return root;
};

type Story = StoryObj<Args>;

export const ProgrammaticActivation: Story = {
  render: () => {
    const root = shell(`
      <h2 style="margin-top:0">Programmatic activation</h2>
      <p style="color:#525252">No keyboard required. The button below calls <code>handle.activate()</code> directly.</p>
      <div style="display:flex;gap:.5rem;margin-bottom:1rem">
        <button id="trigger" style="background:#7c3aed;color:white;border:none;padding:.5rem .75rem;border-radius:.375rem">
          Activate hint mode
        </button>
        <button id="cancel" style="padding:.5rem .75rem;border-radius:.375rem;border:1px solid #d4d4d4;background:white">
          Cancel
        </button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem">
        ${Array.from({ length: 8 }, (_, i) => `<button>Target ${i + 1}</button>`).join('')}
      </div>
    `);

    return withLifecycle(root, (container) => {
      const handle = createLinkHints();
      container.querySelector<HTMLButtonElement>('#trigger')?.addEventListener('click', () => {
        handle.activate();
      });
      container.querySelector<HTMLButtonElement>('#cancel')?.addEventListener('click', () => {
        handle.cancel();
      });
      return handle;
    });
  }
};

export const LiveStateInspector: Story = {
  render: () => {
    const root = shell(`
      <h2 style="margin-top:0">Live state inspector</h2>
      <p style="color:#525252">Press <kbd>f</kbd>. The panel below mirrors <code>handle.subscribe()</code>.</p>
      <div style="display:grid;grid-template-columns:1fr 280px;gap:1rem">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem">
          ${Array.from({ length: 9 }, (_, i) => `<button>Item ${i + 1}</button>`).join('')}
        </div>
        <pre id="state" style="background:#0a0a0a;color:#e5e5e5;padding:.75rem;border-radius:.375rem;font-size:.75rem;margin:0;overflow:auto;max-height:240px"></pre>
      </div>
    `);

    return withLifecycle(root, (container) => {
      const panel = container.querySelector<HTMLPreElement>('#state');
      const handle = createLinkHints();
      const render = (state: LinkHintsState): void => {
        if (!panel) return;
        const labels = Array.from(state.hints.values());
        panel.textContent = JSON.stringify(
          {
            status: state.status,
            typedPrefix: state.typedPrefix,
            hintCount: state.hints.size,
            firstFiveLabels: labels.slice(0, 5)
          },
          null,
          2
        );
      };
      render(handle.getState());
      handle.subscribe(render);
      return handle;
    });
  }
};

export const ScopedRoot: Story = {
  render: () => {
    const root = shell(`
      <h2 style="margin-top:0">Scoped root</h2>
      <p style="color:#525252">Only buttons inside the highlighted box receive hints. Buttons outside it are ignored.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div>
          <h3 style="margin:0 0 .5rem">Outside (no hints)</h3>
          <div style="display:grid;gap:.5rem">
            <button>Outside A</button>
            <button>Outside B</button>
            <a href="#nope">Outside link</a>
          </div>
        </div>
        <div id="scope" style="border:2px solid #2563eb;padding:.75rem;border-radius:.5rem">
          <h3 style="margin:0 0 .5rem;color:#2563eb">Inside (hints active)</h3>
          <div style="display:grid;gap:.5rem">
            <button>Inside A</button>
            <button>Inside B</button>
            <a href="#nope">Inside link</a>
          </div>
        </div>
      </div>
    `);

    return withLifecycle(root, (container) => {
      const scope = container.querySelector<HTMLElement>('#scope');
      if (!scope) throw new Error('scope missing');
      return createLinkHints({ root: scope });
    });
  }
};

export const TwoInstances: Story = {
  render: () => {
    const root = shell(`
      <h2 style="margin-top:0">Two instances, different keys</h2>
      <p style="color:#525252">
        Press <kbd>f</kbd> for the left panel, <kbd>j</kbd> for the right. Each instance is scoped to its own subtree.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div id="left" style="border:1px solid #d4d4d4;padding:.75rem;border-radius:.5rem">
          <h3 style="margin:0 0 .5rem">Left (f)</h3>
          <div style="display:grid;gap:.5rem">
            <button>Left 1</button>
            <button>Left 2</button>
            <button>Left 3</button>
          </div>
        </div>
        <div id="right" style="border:1px solid #d4d4d4;padding:.75rem;border-radius:.5rem">
          <h3 style="margin:0 0 .5rem">Right (j)</h3>
          <div style="display:grid;gap:.5rem">
            <button>Right 1</button>
            <button>Right 2</button>
            <button>Right 3</button>
          </div>
        </div>
      </div>
    `);

    return withLifecycle(root, (container) => {
      const left = container.querySelector<HTMLElement>('#left');
      const right = container.querySelector<HTMLElement>('#right');
      if (!left || !right) throw new Error('panes missing');
      return [
        createLinkHints({ root: left, activationKey: 'f' }),
        createLinkHints({ root: right, activationKey: 'j' })
      ];
    });
  }
};

export const CustomOnActivate: Story = {
  render: () => {
    const root = shell(`
      <h2 style="margin-top:0">Custom <code>onActivate</code></h2>
      <p style="color:#525252">Instead of dispatching the click sequence, the lib forwards the target to a custom handler that flashes it.</p>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem">
        ${Array.from({ length: 8 }, (_, i) => `<button>Flash ${i + 1}</button>`).join('')}
      </div>
      <p id="log" style="color:#525252;margin-top:1rem;font-family:ui-monospace,monospace"></p>
    `);

    return withLifecycle(root, (container) => {
      const log = container.querySelector<HTMLElement>('#log');
      const flash = (target: HTMLElement): void => {
        const previous = target.style.boxShadow;
        target.style.transition = 'box-shadow .25s';
        target.style.boxShadow = '0 0 0 4px #f59e0b';
        if (log) log.textContent = `Activated: ${target.textContent ?? ''}`;
        setTimeout(() => {
          target.style.boxShadow = previous;
        }, 600);
      };
      return createLinkHints({ onActivate: flash });
    });
  }
};

export const RoleAndContenteditable: Story = {
  render: () =>
    withLifecycle(
      shell(`
        <h2 style="margin-top:0">Non-standard clickables</h2>
        <p style="color:#525252">
          The detection picks up <code>role="button"</code>, <code>tabindex</code>, <code>contenteditable</code>,
          and elements with click handlers attached.
        </p>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:.75rem">
          <div role="button" tabindex="0" style="padding:.75rem;border:1px solid #d4d4d4;border-radius:.375rem;cursor:pointer;background:#fef3c7">
            div role="button"
          </div>
          <span tabindex="0" style="padding:.75rem;border:1px solid #d4d4d4;border-radius:.375rem;display:inline-block">
            tabindex span
          </span>
          <div contenteditable="true" style="padding:.75rem;border:1px solid #d4d4d4;border-radius:.375rem;min-height:2.5rem">
            contenteditable: type here
          </div>
          <div id="handler" style="padding:.75rem;border:1px solid #d4d4d4;border-radius:.375rem;cursor:pointer">
            div w/ click handler
          </div>
        </div>
        <p id="status" style="color:#525252;margin-top:1rem"></p>
      `),
      (container) => {
        const handler = container.querySelector<HTMLDivElement>('#handler');
        const status = container.querySelector<HTMLElement>('#status');
        let count = 0;
        handler?.addEventListener('click', () => {
          count += 1;
          if (status) status.textContent = `Handler clicked: ${count}`;
        });
        return createLinkHints();
      }
    )
};

export const OffscreenAndScroll: Story = {
  render: () =>
    withLifecycle(
      shell(`
        <h2 style="margin-top:0">Off-screen filtering</h2>
        <p style="color:#525252">Only visible elements get hints. Scroll the inner container to see new ones get labels on the next activation.</p>
        <div style="height:240px;overflow:auto;border:1px solid #d4d4d4;padding:.75rem;border-radius:.5rem">
          <div style="display:grid;gap:.5rem">
            ${Array.from({ length: 50 }, (_, i) => `<button>Row ${i + 1}</button>`).join('')}
          </div>
        </div>
      `),
      () => createLinkHints()
    )
};

export const DisabledAndHidden: Story = {
  render: () =>
    withLifecycle(
      shell(`
        <h2 style="margin-top:0">Disabled / hidden / aria-hidden</h2>
        <p style="color:#525252">Disabled, <code>hidden</code>, <code>display:none</code>, and zero-size elements are skipped.</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem">
          <button>Enabled</button>
          <button disabled>Disabled (skipped)</button>
          <button hidden>Hidden attribute (skipped)</button>
          <button style="display:none">display:none (skipped)</button>
          <button style="visibility:hidden">visibility:hidden (skipped)</button>
          <button aria-hidden="true">aria-hidden (skipped)</button>
          <button>Enabled</button>
          <button style="width:0;height:0;padding:0;border:0">zero-size (skipped)</button>
          <button>Enabled</button>
        </div>
      `),
      () => createLinkHints()
    )
};

export const PinnedAndFiltered: Story = {
  render: () =>
    withLifecycle(
      shell(`
        <h2 style="margin-top:0">Custom pinning + filtering together</h2>
        <p style="color:#525252">
          <code>pinnedHint</code> reads from <code>data-shortcut</code> instead of the default <code>data-hint</code>.
          <code>isClickable</code> excludes anything inside <code>[data-no-hints]</code>.
        </p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem">
          <button data-shortcut="GO">Pinned via data-shortcut</button>
          <button data-shortcut="UP">Also pinned</button>
          <button>Auto-assigned</button>
          <div data-no-hints style="grid-column:1/-1;padding:.75rem;border:1px dashed #d4d4d4;border-radius:.375rem">
            <p style="color:#737373;margin:0 0 .5rem">Excluded subtree</p>
            <button>Hidden from hints</button>
            <button>Hidden from hints</button>
          </div>
          <button>Auto-assigned</button>
          <button>Auto-assigned</button>
        </div>
      `),
      () => {
        const options: LinkHintsOptions = {
          pinnedHint: (element) => element.dataset.shortcut?.toUpperCase(),
          isClickable: (element) => (element.closest('[data-no-hints]') ? false : undefined)
        };
        return createLinkHints(options);
      }
    )
};

export const LongLabels: Story = {
  render: () =>
    withLifecycle(
      shell(`
        <h2 style="margin-top:0">Tiny <code>hintChars</code> set</h2>
        <p style="color:#525252">Only 3 chars in the alphabet — labels grow to 2-3 letters once you exceed the alphabet size.</p>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:.5rem">
          ${Array.from({ length: 18 }, (_, i) => `<button>Item ${i + 1}</button>`).join('')}
        </div>
      `),
      () => createLinkHints({ hintChars: 'abc' })
    )
};
