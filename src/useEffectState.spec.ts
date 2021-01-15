import { act, renderHook } from '@testing-library/react-hooks';
import { useEffectState } from './useEffectState';

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
      await result.current.dispatch(Actions.A);
      expect(result.current.state.a).toEqual(1);
      expect(result.current.state.b).toEqual(undefined);
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
      await result.current.dispatch(Actions.A);
      const res = await result.current.dispatch(Actions.B);
      expect(result.current.state.a).toEqual(1);
      expect(result.current.state.b).toEqual(2);
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
      await result.current.dispatch(Actions.A);
    });
  });
});
