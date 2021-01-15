import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Effect,
  EffectRecord,
  EventHandler,
  PartialRecord,
  PromiseRecord,
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
export function useEffectState<A extends string, S>(
  initialState: S,
  initialEffects: EffectRecord<A | string, S>
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

  // This ref contains all the current unresolved promises for dispatches
  // that were called.
  const promises = useRef(new Map<symbol, PromiseRecord<S>>());

  // This ref contains all effects for all actions
  // This is used mostly to clean things up when component is unmounted
  const allEffectsArray = useRef<PartialRecord<A, EventHandler[]>>({});

  // The state. This is it.
  const [state, setState] = useState<S>(stateRef.current);

  // Dispatch function - always needs to be awaited.
  const dispatch = useCallback((action: A) => {
    if (target.current) {
      return new Promise<S | undefined>((resolve, reject) => {
        const dispatchSymbol = Symbol();
        promises.current.set(dispatchSymbol, { resolve, reject });
        target.current?.dispatchEvent(
          new CustomEvent(action, { detail: dispatchSymbol })
        );
      });
    } else {
      return;
    }
  }, []);

  // Takes an effect and creates a listener around it
  // utilizing the promises ref and setState
  const getListener = useCallback(
    (effect: Effect<S>) => (event: Event) => {
      (async function () {
        const keySymbol = (event as CustomEvent<symbol>).detail;
        const { resolve, reject } = promises.current.get(keySymbol) || {};
        try {
          const newState = await effect(stateRef.current);
          if (newState) {
            stateRef.current = newState;
            setState(newState);
            resolve?.(newState);
          } else {
            resolve?.();
          }
        } catch (error) {
          reject?.(error);
        }
        promises.current.delete(keySymbol);
      })();
    },
    []
  );

  // function exposed through the current hook to allow
  // adding effects. This function can allow for both side-effects and main-effects
  // side-effects = functions that receive the current state but do not return a new state
  // main-effects = same as side-effects except that a new `state` is returned
  const addEffect = useCallback(
    (action: A, effect: Effect<S>) => {
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
    for (const action in initialEffectsArray.current) {
      const effect = initialEffectsArray.current[action];
      addEffect(action as A, effect);
    }

    return cleanup;
  }, [cleanup, addEffect]);

  return {
    state,
    dispatch,
    addEffect,
  };
}
