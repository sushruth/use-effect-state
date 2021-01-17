export const getListenerRaw = <A extends string, S>(
  effect: Effect<A | string, S>
) => (event: Event) => {
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
};
