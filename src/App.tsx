import * as React from 'react';
import './styles.css';
import { Counter1, example1 } from './examples';

export default function App() {
  return (
    <main className="App">
      <h1>
        <code>useEffectState</code>
      </h1>
      <p>Event based global or local state management for react as a hook</p>
      <h2>Usage</h2>
      <img
        src="https://i.imgur.com/zn1i2C5.png"
        style={{ maxWidth: '100%' }}
        alt="code example"
      />
      <h2>Demo</h2>
      <Counter1 />
      <h2>Tips</h2>
      <ul>
        <li>
          Use <code>produce</code> function from{' '}
          <a href="https://immerjs.github.io/immer/docs/produce">
            <code>immerjs</code>
          </a>{' '}
          to introduce immutability to the state
        </li>
        <li>
          Use <code>addEffect</code> to add sideEffects - when the effect
          function does not return any state, it will just become a side-effect
        </li>
        <li>
          Dynamically add new actions, effects and state sections from
          lazy-loaded content by passing <code>state</code>,{' '}
          <code>dispatch</code>, and <code>addEffect</code> as props to the
          lazy-loaded content
        </li>
        <li>Mitochondria is the powerhouse of the cell</li>
      </ul>
    </main>
  );
}
