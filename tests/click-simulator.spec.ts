import { describe, expect, it, beforeEach, vi } from 'vitest';
import { simulateClick, performTargetAction } from '../src/utils/click-simulator';

const recordEvents = (target: HTMLElement): string[] => {
  const events: string[] = [];
  for (const type of [
    'pointerover',
    'mouseover',
    'pointerdown',
    'mousedown',
    'pointerup',
    'mouseup',
    'click'
  ]) {
    target.addEventListener(type, () => events.push(type));
  }
  return events;
};

describe('simulateClick', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('dispatches the seven-event sequence in Vimium order', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    const events = recordEvents(button);

    simulateClick(button);

    expect(events).toEqual([
      'pointerover',
      'mouseover',
      'pointerdown',
      'mousedown',
      'pointerup',
      'mouseup',
      'click'
    ]);
  });

  it('dispatches MouseEvents that bubble and are cancelable', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    let captured: MouseEvent | undefined;
    button.addEventListener('click', (event) => {
      captured = event as MouseEvent;
    });

    simulateClick(button);

    expect(captured).toBeInstanceOf(MouseEvent);
    expect(captured?.bubbles).toBe(true);
    expect(captured?.cancelable).toBe(true);
    expect(captured?.button).toBe(0);
    expect(captured?.detail).toBe(1);
  });

  it('targets the centre of the element via getBoundingClientRect', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.getBoundingClientRect = (): DOMRect =>
      ({ left: 100, top: 50, width: 40, height: 20 }) as DOMRect;

    let captured: MouseEvent | undefined;
    button.addEventListener('click', (event) => {
      captured = event as MouseEvent;
    });

    simulateClick(button);

    expect(captured?.clientX).toBe(120);
    expect(captured?.clientY).toBe(60);
  });
});

describe('performTargetAction', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('focuses textareas without dispatching click events', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const click = vi.fn();
    textarea.addEventListener('click', click);

    performTargetAction(textarea);

    expect(document.activeElement).toBe(textarea);
    expect(click).not.toHaveBeenCalled();
  });

  it('focuses contentEditable elements without clicking', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.tabIndex = 0;
    document.body.appendChild(div);
    const click = vi.fn();
    div.addEventListener('click', click);

    performTargetAction(div);

    expect(document.activeElement).toBe(div);
    expect(click).not.toHaveBeenCalled();
  });

  it('focuses text-entry inputs without clicking', () => {
    const input = document.createElement('input');
    input.type = 'email';
    document.body.appendChild(input);
    const click = vi.fn();
    input.addEventListener('click', click);

    performTargetAction(input);

    expect(document.activeElement).toBe(input);
    expect(click).not.toHaveBeenCalled();
  });

  it('clicks button-type inputs after focusing', () => {
    const input = document.createElement('input');
    input.type = 'submit';
    document.body.appendChild(input);
    const events = recordEvents(input);

    performTargetAction(input);

    expect(events).toContain('click');
    expect(document.activeElement).toBe(input);
  });

  it('focuses native <select> before clicking', () => {
    const select = document.createElement('select');
    document.body.appendChild(select);
    const events = recordEvents(select);

    performTargetAction(select);

    expect(events).toContain('click');
    expect(document.activeElement).toBe(select);
  });

  it('clicks ordinary buttons and focuses afterward', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    const events = recordEvents(button);

    performTargetAction(button);

    expect(events).toEqual([
      'pointerover',
      'mouseover',
      'pointerdown',
      'mousedown',
      'pointerup',
      'mouseup',
      'click'
    ]);
    expect(document.activeElement).toBe(button);
  });
});
