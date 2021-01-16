import React, { useCallback } from 'react';
import { useEffectState } from '../useEffectState/useEffectState';
import { EffectRecord } from '../useEffectState/useEffectState.types';

enum Actions {
  A = 'A',
  B = 'B',
  C = 'C',
}

type State = Record<string, number>;

const effectA = (state: State): State => {
  return {
    ...state,
    a: (state.a || 0) + 1,
  };
};

const effectB = (state: State): State => {
  return {
    ...state,
    b: (state.b || 0) + 1,
  };
};

const effectRecord: EffectRecord<Actions, State> = {
  [Actions.A]: effectA,
  [Actions.B]: effectB,
};

export const Counter1: React.FC = () => {
  const [counts, dispatch, addEffect] = useEffectState({}, effectRecord, {
    dispatchMaxCircularCalls: 10,
  });

  const addSideEffect = useCallback(() => {
    addEffect(Actions.C, async (state, dispatch) => {
      await dispatch(Actions.A);
      const latestState = await dispatch(Actions.B);
      return {
        ...latestState,
        c: (state.c || 0) + 1,
      };
    });
  }, [addEffect]);

  return (
    <div style={{ padding: 10, background: '#efe' }}>
      Values:
      <ul>
        <li>a: {counts.a || 'none'}</li>
        <li>b: {counts.b || 'none'}</li>
        <li>c: {counts.c || 'none'}</li>
      </ul>
      <div>
        <button onClick={() => dispatch(Actions.A)}>Dispatch A</button>
        <button onClick={() => dispatch(Actions.B)}>Dispatch B</button>
        <button onClick={() => dispatch(Actions.C)}>Dispatch C</button>
      </div>
      <button onClick={addSideEffect}>Add C effect once</button>
    </div>
  );
};
