import { act, renderHook } from '@testing-library/react-hooks';
import { useEffectState } from './useEffectState';
import { Effect } from './useEffectState.types';

describe('useEventState', () => {
  enum Actions {
    A = 'A',
    B = 'B',
  }

  type State = Record<string, number>;

  const effectA = (state: State): State => {
    return { ...state, a: 1 };
  };

  const effectB = (state: State): State => {
    return { ...state, b: 2 };
  };

  it('dispatches actions and observes state change', async () => {
    const { result } = renderHook(() =>
      useEffectState(
        {},
        {
          [Actions.A]: effectA,
          [Actions.B]: effectB,
        }
      )
    );

    await act(async () => {
      await result.current[1](Actions.A);
      expect(result.current[0].a).toEqual(1);
      expect(result.current[0].b).toEqual(undefined);
    });
  });

  it('dispatches actions and returns async results', async () => {
    const { result } = renderHook(() =>
      useEffectState({} as State, {
        [Actions.A]: effectA,
        [Actions.B]: effectB,
      })
    );

    await act(async () => {
      await result.current[1](Actions.A);
      const res = await result.current[1](Actions.B);
      expect(result.current[0].a).toEqual(1);
      expect(result.current[0].b).toEqual(2);
      expect(res).toEqual(expect.objectContaining({ b: 2 }));
    });
  });

  it('Handles unmount and then dispatch gracefully', async () => {
    const { result, unmount } = renderHook(() =>
      useEffectState({} as State, {
        [Actions.A]: effectA,
        [Actions.B]: effectB,
      })
    );

    unmount();

    await act(async () => {
      await result.current[1](Actions.A);
    });
  });

  it('dispatch rejects when circular maxDepth is reached', async () => {
    const circularEffectA: Effect<Actions, State> = async (state, dispatch) => {
      await dispatch(Actions.B);
      return {
        ...state,
        a: state.a + 1,
      };
    };

    const circularEffectB: Effect<Actions, State> = async (state, dispatch) => {
      await dispatch(Actions.A);
      return {
        ...state,
        a: state.b + 1,
      };
    };

    const dispatchMaxCircularCalls = 200;

    const { result } = renderHook(() =>
      useEffectState<State>(
        {},
        {
          [Actions.A]: circularEffectA,
          [Actions.B]: circularEffectB,
        },
        {
          dispatchMaxCircularCalls,
        }
      )
    );

    act(() => {
      expect(result.current[1](Actions.A)).rejects.toContain(
        dispatchMaxCircularCalls
      );
    });
  });
});
