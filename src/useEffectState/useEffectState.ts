import { useCallback, useEffect, useRef, useState } from 'react';
import { MAXDEPTH } from './useEffectState.constants';
import {
  CustomEffectEvent,
  CustomEventDetail,
  DispatchEffect,
  Effect,
  EffectRecord,
  EffectStateOptions,
  EventHandler,
  PartialRecord,
  TraceDispatch,
} from './useEffectState.types';

/**
 * A hook that works almost like useReducer except that a single action
 * can have multiple "reducer"s or "effect"s as called here, which may or may not return a new state.
 * When an effect returns a new state, it is similar to a reducer (or main-effect as called here), but
 * when an effect does not return a new state, it becomes a side-effect
 * @param initialState any state that needs to be tracked
 * @param {Record<Action | string, Effect>} initialEffects - represents initial
 * set of effects registered for given `Action`s
 */
export function useEffectState<S, A extends string = string>(
  initialState: S,
  initialEffects?: EffectRecord<A | string, S>,
  options?: EffectStateOptions
) {
  /**
   * Lets initialize a TON of refs.
   */

  // This will be used to store the most updated state at any given moment
  // and also as the input to registered listeners for any action
  const stateRef = useRef(initialState);

  // This array is ref'd so that we dont keep registering effects if
  // somehow an in-line object is passed as initialEffects
  const initialEffectsArray = useRef(initialEffects);

  // This defines the fake target that we use to dispatch and handle events on
  // This is not available in NodeJS but work is going on about that -
  // https://github.com/nodejs/node/pull/33556
  const target = useRef<EventTarget | undefined>(new EventTarget());

  // This ref contains all effects for all actions
  // This is used mostly to clean things up when component is unmounted
  const allEffectsArray = useRef<PartialRecord<A, EventHandler[]>>({});

  // The state. This is it.
  const [state, setState] = useState<S>(stateRef.current);

  // Initialize the max depth for circular calls in a single dispatch to a single action
  const maxTraceDepth = options?.dispatchMaxCircularCalls || MAXDEPTH;

  const getNextTrace = useCallback(
    (action: A | string, trace?: TraceDispatch<A>): TraceDispatch<A> => {
      if (!trace) return { [action]: 1 } as TraceDispatch<A>;

      const traceCount: number | undefined = trace[action] || 0;

      if (traceCount) {
        if (traceCount > maxTraceDepth) {
          throw new Error(
            `Max circular dispatch depth of ${traceCount} reached for ${action}`
          );
        } else {
          trace[action] = traceCount + 1;
        }
      } else {
        trace[action] = 1;
      }

      return trace;
    },
    [maxTraceDepth]
  );

  const dispatchTrace = useCallback(
    (previousTrace?: TraceDispatch<A>) => (action: A | string) => {
      if (target.current) {
        return new Promise<S | undefined>((resolve, reject) => {
          const trace = getNextTrace(action, previousTrace);
          target.current?.dispatchEvent(
            new CustomEvent<CustomEventDetail<A, S>>(action, {
              detail: { resolve, reject, trace },
            })
          );
        });
      } else {
        return Promise.resolve(undefined);
      }
    },
    [getNextTrace]
  );

  const dispatch = useCallback(
    (action: A | string) => dispatchTrace()(action),
    [dispatchTrace]
  );

  // Takes an effect and creates a listener around it
  // utilizing the promises ref and setState
  const getListener = useCallback(
    (effect: Effect<A | string, S>) => (event: Event) => {
      (async function () {
        const { resolve, reject, trace } = (event as CustomEffectEvent<
          A,
          S
        >).detail;

        try {
          const newState = await effect(stateRef.current, dispatchTrace(trace));

          if (newState) {
            stateRef.current = newState;
            setState(newState);
            resolve(newState);
          } else {
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      })();
    },
    [dispatch]
  );

  // function exposed through the current hook to allow
  // adding effects. This function can allow for both side-effects and main-effects
  // side-effects = functions that receive the current state but do not return a new state
  // main-effects = same as side-effects except that a new `state` is returned
  const addEffect = useCallback(
    (action: A | string, effect: Effect<A | string, S>) => {
      const listener = getListener(effect);
      const handlers = allEffectsArray.current[action] as
        | EventHandler[]
        | undefined;

      if (handlers && !handlers.includes(listener)) {
        handlers.push(listener);
      } else {
        allEffectsArray.current[action] = [listener];
      }

      target.current?.addEventListener(action, listener);
    },
    [getListener]
  );

  // Clean up all event listeners and remove the event target as well just to be sure.
  const cleanup = useCallback(() => {
    // initialEffects are also in allEffectsArray
    for (const action in allEffectsArray.current) {
      const listeners = allEffectsArray.current[action];

      if (listeners) {
        for (const listener of listeners) {
          target.current?.removeEventListener(action, listener);
        }
      }
    }
    target.current = undefined;
  }, []);

  // To initialize the intiailEffects
  useEffect(() => {
    if (initialEffectsArray.current) {
      for (const action in initialEffectsArray.current) {
        const effect = initialEffectsArray.current[action];
        addEffect(action as A, effect);
      }
    }

    return cleanup;
  }, [cleanup, addEffect]);

  return [state, dispatch as DispatchEffect<A | string, S>, addEffect] as const;
}
