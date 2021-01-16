export type PromiseRecord<T> = {
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
};

export type TraceDispatch<A extends string> = Record<
  A | string,
  number | undefined
>;

export type CustomEventDetail<A extends string, S> = PromiseRecord<S> & {
  trace: TraceDispatch<A>;
};

export type CustomEffectEvent<A extends string, S> = CustomEvent<
  CustomEventDetail<A, S>
>;

export type DispatchEffect<A extends string, S> = (
  action: A | string
) => Promise<S | undefined>;

export type Effect<A extends string, S> = (
  state: S,
  dispatch: DispatchEffect<A | string, S>
) => S | void | Promise<S | void>;

export type EffectRecord<A extends string, S> = Record<
  A | string,
  Effect<A | string, S>
>;

export type EventHandler = (event: Event) => void;

export type PartialRecord<K extends string, T> = {
  [A in K | string]?: T;
};

export type EffectStateOptions = {
  /**
   * defaults to 20
   */
  dispatchMaxCircularCalls?: number;
};
