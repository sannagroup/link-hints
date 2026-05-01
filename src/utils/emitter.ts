/**
 * Tiny synchronous event emitter. No dependencies.
 *
 * Used internally so the badge renderer and any `handle.subscribe(...)`
 * consumer can react to state changes.
 */
export class Emitter<T> {
  private listeners = new Set<(value: T) => void>();

  subscribe(listener: (value: T) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(value: T): void {
    for (const listener of [...this.listeners]) {
      listener(value);
    }
  }

  size(): number {
    return this.listeners.size;
  }

  clear(): void {
    this.listeners.clear();
  }
}
