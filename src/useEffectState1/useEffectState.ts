import { useCallback, useMemo, useRef, useState } from 'react';

type ActionObject<A, P> = {
  type: A;
  payload: P;
};

type Resolve<T> = (value?: T | PromiseLike<T>) => void;

type Reject = (reason?: any) => void;

type Trace<A extends string> = {
  [K in A | string]: number;
};

type CustomEventDetail<A extends string, P, S> = {
  reject: Reject;
  resolve: Resolve<S>;
  payload: P;
  trace: Trace<A>;
};

type Dispatch<A, P, S> = (
  action: ActionObject<A, P>
) => Promise<S | void> | S | void;

type Effect<A, P, S> = (
  payload: P,
  state: S,
  dispatch: Dispatch<A, P, S>
) => Promise<S | void> | S | void;

export function useEffectState<ActionType extends string, S>(initialState: S) {
  type A = ActionType | string;

  const stateRef = useRef(initialState);
  const target = useRef(new EventTarget());

  const [state, setState] = useState(initialState);

  const getDispatch = useCallback(
    (trace?: Trace<A>) => <P>(action: ActionObject<A, P>) => {
      return new Promise<S | void>((resolve, reject) => {
        const { type, payload } = action;

        trace = trace[type]
          ? { ...trace, [type]: trace[type] + 1 }
          : ({ [type]: 1 } as Trace<A>);

        target.current?.dispatchEvent(
          new CustomEvent<CustomEventDetail<A, P, S>>(type, {
            detail: {
              payload,
              resolve,
              reject,
              trace,
            },
          })
        );
      });
    },
    []
  );

  const addEffect = useCallback(
    <P>(actionType: A, effect: Effect<A, P, S>) => {
      target.current?.addEventListener(
        actionType,
        (event: CustomEvent<CustomEventDetail<A, P, S>>) => {
          async function run() {
            const { resolve, reject, payload, trace } = event.detail;
            try {
              const newState = await effect(
                payload,
                stateRef.current,
                getDispatch(trace)
              );

              if (newState) {
                stateRef.current = newState;
                resolve(newState);
                setState(newState);
              } else {
                resolve();
              }
            } catch (error) {
              reject(error);
            }
          }

          run();
        }
      );
    },
    [getDispatch]
  );

  const firstDispatch = useMemo(() => getDispatch(), [getDispatch]);

  return [state, firstDispatch, addEffect];
}
