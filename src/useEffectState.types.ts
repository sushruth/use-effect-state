export type PromiseRecord<T> = {
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
};

export type Effect<S> = (state: S) => S | void | Promise<S | void>;
export type EffectRecord<A extends string, S> = Record<A, Effect<S>>;
export type EventHandler = (event: Event) => void;

export type PartialRecord<K extends string, T> = {
  [A in K | string]?: T;
};
