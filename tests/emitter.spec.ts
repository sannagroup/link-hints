import { describe, expect, it, vi } from 'vitest';
import { Emitter } from '../src/utils/emitter';

describe('Emitter', () => {
  it('delivers emitted values to subscribers', () => {
    const emitter = new Emitter<number>();
    const listener = vi.fn();
    emitter.subscribe(listener);

    emitter.emit(7);

    expect(listener).toHaveBeenCalledWith(7);
  });

  it('returns an unsubscribe function', () => {
    const emitter = new Emitter<number>();
    const listener = vi.fn();
    const unsubscribe = emitter.subscribe(listener);

    unsubscribe();
    emitter.emit(1);

    expect(listener).not.toHaveBeenCalled();
  });

  it('size() reflects the number of active subscribers', () => {
    const emitter = new Emitter<void>();
    expect(emitter.size()).toBe(0);

    const off1 = emitter.subscribe(() => {});
    const off2 = emitter.subscribe(() => {});
    expect(emitter.size()).toBe(2);

    off1();
    expect(emitter.size()).toBe(1);

    off2();
    expect(emitter.size()).toBe(0);
  });

  it('clear() removes every listener', () => {
    const emitter = new Emitter<number>();
    const listener = vi.fn();
    emitter.subscribe(listener);

    emitter.clear();
    emitter.emit(42);

    expect(listener).not.toHaveBeenCalled();
    expect(emitter.size()).toBe(0);
  });

  it('emit snapshots listeners so unsubscribing during emit is safe', () => {
    const emitter = new Emitter<number>();
    const second = vi.fn();
    const first = (): void => {
      emitter.clear();
    };
    emitter.subscribe(first);
    emitter.subscribe(second);

    emitter.emit(1);

    expect(second).toHaveBeenCalledWith(1);
  });
});
