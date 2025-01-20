import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import MainCharacter from './characters/mainCharacter'
import { Loader } from './components/loader'
import 'bootstrap/dist/css/bootstrap.min.css'
import HomePage from './components/HomePage'

function App() {
  const [count, setCount] = useState(0)
  
  

  return (
    <>
      {/* <MainCharacter/> */}
      <HomePage/>
    </>
  )
}

export default App
