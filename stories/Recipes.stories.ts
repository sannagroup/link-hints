import type { Meta, StoryObj } from '@storybook/html-vite';
import {
  createLinkHints,
  performTargetAction,
  type LinkHintsHandle,
  type LinkHintsOptions
} from '../src/index.js';

type Args = Record<string, never>;

const meta: Meta<Args> = {
  title: 'Link Hints/README Recipes',
  parameters: {
    docs: {
      description: {
        component:
          'Live runs of the eight "Usage recipes" examples from the README, in the same order. Press <kbd>f</kbd> in each story to try them.'
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
  setup: (root: HTMLElement) => LinkHintsHandle
): HTMLElement => {
  let handle: LinkHintsHandle | undefined;
  queueMicrotask(() => {
    handle = setup(root);
  });

  const observer = new MutationObserver(() => {
    if (!root.isConnected && handle) {
      handle.dispose();
      handle = undefined;
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return root;
};

type Story = StoryObj<Args>;

export const PinWithDataHint: Story = {
  name: '1. Pin with data-hint',
  render: () =>
    withLifecycle(
      shell(`
        <h2 style="margin-top:0">1. Pin specific elements with <code>data-hint</code></h2>
        <p style="color:#525252">Each pinned element keeps its mnemonic — auto-assigned labels never collide.</p>
        <nav style="display:flex;flex-direction:column;gap:.5rem;max-width:280px">
          <a href="#organizations" data-hint="OR" style="padding:.5rem .75rem;background:#16a34a;color:white;text-decoration:none;border-radius:.375rem">Organizations (OR)</a>
          <a href="#members" data-hint="ME" style="padding:.5rem .75rem;background:#16a34a;color:white;text-decoration:none;border-radius:.375rem">Members (ME)</a>
          <button data-hint="OP" style="padding:.5rem .75rem;background:#2563eb;color:white;border:none;border-radius:.375rem">Open picker (OP)</button>
          <button style="padding:.5rem .75rem;background:#2563eb;color:white;border:none;border-radius:.375rem">Auto label</button>
          <button style="padding:.5rem .75rem;background:#2563eb;color:white;border:none;border-radius:.375rem">Auto label</button>
        </nav>
      `),
      () => createLinkHints()
    )
};

export const CustomActivationKey: Story = {
  name: '2. Custom activation key',
  render: () =>
    withLifecycle(
      shell(`
        <h2 style="margin-top:0">2. Custom activation key</h2>
        <p style="color:#525252">Press <kbd>g</kbd> instead of <kbd>f</kbd>.</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem">
          ${Array.from({ length: 6 }, (_, i) => `<button>Button ${i + 1}</button>`).join('')}
        </div>
      `),
      () => createLinkHints({ activationKey: 'g' })
    )
};

export const ScopedSubtree: Story = {
  name: '3. Scope to subtree',
  render: () =>
    withLifecycle(
      shell(`
        <h2 style="margin-top:0">3. Scope hints to a specific subtree</h2>
        <p style="color:#525252">Only buttons in the side panel get hints.</p>
        <div style="display:grid;grid-template-columns:1fr 220px;gap:1rem">
          <main style="border:1px solid #e5e5e5;padding:.75rem;border-radius:.5rem">
            <h3 style="margin:0 0 .5rem">Main (no hints)</h3>
            <div style="display:grid;gap:.5rem">
              <button>Main A</button>
              <button>Main B</button>
              <button>Main C</button>
            </div>
          </main>
          <aside id="side-panel" style="border:2px solid #2563eb;padding:.75rem;border-radius:.5rem">
            <h3 style="margin:0 0 .5rem;color:#2563eb">Side panel</h3>
            <div style="display:grid;gap:.5rem">
              <button>Side 1</button>
              <button>Side 2</button>
              <button>Side 3</button>
            </div>
          </aside>
        </div>
      `),
      (container) => {
        const panel = container.querySelector<HTMLElement>('#side-panel');
        if (!panel) throw new Error('panel missing');
        return createLinkHints({ root: panel });
      }
    )
};

export const CustomClickHandler: Story = {
  name: '4. Custom click handler',
  render: () =>
    withLifecycle(
      shell(`
        <h2 style="margin-top:0">4. Custom click handler (analytics)</h2>
        <p style="color:#525252">Each activation logs to the panel and then delegates to <code>performTargetAction</code>.</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:1rem">
          <button id="b1">Save</button>
          <button id="b2">Cancel</button>
          <a href="#nope">Open docs</a>
          <button>Delete</button>
          <button>Share</button>
          <button>Export</button>
        </div>
        <pre id="analytics-log" style="background:#0a0a0a;color:#e5e5e5;padding:.75rem;border-radius:.375rem;font-size:.75rem;margin:0;max-height:160px;overflow:auto">// analytics events</pre>
      `),
      (container) => {
        const log = container.querySelector<HTMLPreElement>('#analytics-log');
        const analyticsTrack = (event: string, payload: Record<string, unknown>): void => {
          if (!log) return;
          log.textContent = `${log.textContent ?? ''}\n${event} ${JSON.stringify(payload)}`;
          log.scrollTop = log.scrollHeight;
        };
        return createLinkHints({
          onActivate: (target) => {
            analyticsTrack('hint_used', {
              id: target.id || undefined,
              tag: target.tagName.toLowerCase(),
              text: target.textContent?.trim().slice(0, 40)
            });
            performTargetAction(target);
          }
        });
      }
    )
};

export const ProgrammaticPinning: Story = {
  name: '5. Programmatic pinning',
  render: () =>
    withLifecycle(
      shell(`
        <h2 style="margin-top:0">5. Programmatic pinning (no DOM attribute)</h2>
        <p style="color:#525252">Pinning is decided by URL pathname — no <code>data-hint</code> attributes on the markup.</p>
        <nav style="display:flex;flex-direction:column;gap:.5rem;max-width:280px">
          <a href="https://example.com/organizations" style="padding:.5rem .75rem;background:#16a34a;color:white;text-decoration:none;border-radius:.375rem">Organizations</a>
          <a href="https://example.com/members" style="padding:.5rem .75rem;background:#16a34a;color:white;text-decoration:none;border-radius:.375rem">Members</a>
          <a href="https://example.com/billing" style="padding:.5rem .75rem;background:#16a34a;color:white;text-decoration:none;border-radius:.375rem">Billing (auto)</a>
          <a href="https://example.com/settings" style="padding:.5rem .75rem;background:#16a34a;color:white;text-decoration:none;border-radius:.375rem">Settings (auto)</a>
        </nav>
      `),
      () => {
        const PIN_BY_HREF: Record<string, string> = {
          '/organizations': 'OR',
          '/members': 'ME'
        };
        const options: LinkHintsOptions = {
          pinnedHint: (element) => {
            if (element instanceof HTMLAnchorElement) {
              return PIN_BY_HREF[new URL(element.href).pathname];
            }
            return undefined;
          }
        };
        return createLinkHints(options);
      }
    )
};

export const ForceIncludeExclude: Story = {
  name: '6. Force include / exclude',
  render: () =>
    withLifecycle(
      shell(`
        <h2 style="margin-top:0">6. Force-include or exclude with <code>isClickable</code></h2>
        <p style="color:#525252">
          <code>.skip-hint</code> opts out. <code>.force-hint</code> opts in (e.g. a custom div without a built-in click handler).
        </p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem">
          <button>Normal</button>
          <button class="skip-hint" style="opacity:.7">.skip-hint (excluded)</button>
          <div class="force-hint" style="padding:.5rem .75rem;border:1px dashed #f59e0b;border-radius:.375rem;text-align:center">
            .force-hint div
          </div>
          <button>Normal</button>
          <button class="skip-hint" style="opacity:.7">.skip-hint (excluded)</button>
          <button>Normal</button>
        </div>
      `),
      () =>
        createLinkHints({
          isClickable: (element) => {
            if (element.classList.contains('skip-hint')) return false;
            if (element.classList.contains('force-hint')) return true;
            return undefined;
          }
        })
    )
};

export const ReactToStateChanges: Story = {
  name: '7. React to state changes',
  render: () =>
    withLifecycle(
      shell(`
        <h2 style="margin-top:0">7. React to state changes</h2>
        <p style="color:#525252">A status pill subscribes to <code>handle.subscribe()</code>.</p>
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">
          <span id="status-pill" style="display:inline-block;padding:.25rem .75rem;background:#e5e5e5;color:#525252;border-radius:9999px;font-size:.875rem;min-width:6rem;text-align:center">idle</span>
          <span style="color:#737373;font-size:.875rem">press <kbd>f</kbd> →</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem">
          ${Array.from({ length: 12 }, (_, i) => `<button>Item ${i + 1}</button>`).join('')}
        </div>
      `),
      (container) => {
        const statusPill = container.querySelector<HTMLElement>('#status-pill');
        const hints = createLinkHints();
        hints.subscribe((state) => {
          if (!statusPill) return;
          if (state.status === 'active') {
            statusPill.textContent = `${state.hints.size} hints`;
            statusPill.style.background = '#fde68a';
            statusPill.style.color = '#92400e';
          } else {
            statusPill.textContent = 'idle';
            statusPill.style.background = '#e5e5e5';
            statusPill.style.color = '#525252';
          }
        });
        return hints;
      }
    )
};

export const ForceActivateFromButton: Story = {
  name: '8. Force-activate from a button',
  render: () =>
    withLifecycle(
      shell(`
        <h2 style="margin-top:0">8. Force-activate from a button</h2>
        <p style="color:#525252">Click the help button to activate hint mode without pressing a key.</p>
        <button id="help-button" style="padding:.5rem .75rem;background:#7c3aed;color:white;border:none;border-radius:.375rem;margin-bottom:1rem;cursor:pointer">
          ? Help
        </button>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem">
          ${Array.from({ length: 8 }, (_, i) => `<button>Action ${i + 1}</button>`).join('')}
        </div>
      `),
      (container) => {
        const hints = createLinkHints();
        container.querySelector('#help-button')?.addEventListener('click', () => {
          hints.activate();
        });
        return hints;
      }
    )
};

export const Theming: Story = {
  name: 'Bonus: Theming with CSS variables',
  render: () =>
    withLifecycle(
      (() => {
        const root = shell(`
          <h2 style="margin-top:0">Theming with CSS variables</h2>
          <p style="color:#525252">README §Theming — overrides the badge palette / font / radius.</p>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem">
            ${Array.from({ length: 8 }, (_, i) => `<button>Themed ${i + 1}</button>`).join('')}
          </div>
        `);
        const style = document.createElement('style');
        style.textContent = `
          .link-hints-badge {
            --link-hints-bg: tomato;
            --link-hints-fg: white;
            --link-hints-ring: transparent;
            --link-hints-radius: 6px;
            --link-hints-font: 'Fira Code', monospace;
            --link-hints-size: 12px;
          }
          .link-hints-badge__typed { opacity: 0.4; }
          .link-hints-badge__remaining { font-weight: 800; }
        `;
        root.append(style);
        return root;
      })(),
      () => createLinkHints()
    )
};
