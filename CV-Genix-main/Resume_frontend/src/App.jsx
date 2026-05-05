import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
     <div className="p-10" data-theme="cupcake">
     <h1 className='text-5xl text-green-500'>Welcome to Resume app</h1>
     </div>
     <button class="btn w-64 rounded-full">Button</button>
    </>
  );
}

export default App;
