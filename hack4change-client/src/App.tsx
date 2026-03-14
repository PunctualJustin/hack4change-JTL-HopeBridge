import { useEffect, useState } from 'react'
import './App.css'
import counter from './counter'
import { getHello } from './api/hello'

const App = () => {
  const [count, setCount] = useState(counter());
  const [hello, setHello] = useState("");

  useEffect(() => {
    getHello()
      .then(setHello)
      .catch(console.error);
  });

  return (
    <>
      <h1>{hello}</h1>

      <p className="welcome">
        Welcome to the Hack4Change workshop application. This isn't the same repository that we'll be providing at the actual event, but the structure and tools in it are very similar so you can use this to practice with those and get a handle on how everything works.
      </p>

      <p>
        This client includes a few tools and libraries to help you get started. If you want to know more, check the README.MD file for the commands available when running this client, as well as links to documentation for the various tools in use by this application.
      </p>

      <p>
        Below is a simple counter. This is here to give you a very basic example of how state can be managed in React, in case you're not familiar.
      </p>

      <section>
        <p>{count.value()}</p>
        <button onClick={() => setCount(count.increment())}>Increment</button>
        <button onClick={() => setCount(count.decrement())}>Decrement</button>
      </section>
    </>
  )
}

export default App
