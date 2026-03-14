import { useEffect, useState } from 'react'
import './App.css'
import counter from './counter'
import { getHello } from './api/hello'
import LoginPage from './login_page'
import DonorDashboard from "./donor_dashboard"
import OrgDashboard from "./org_dashboard"
import RequestForm from "./request_form";

const App = () => {

  const [count, setCount] = useState(counter())
  const [hello, setHello] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  

  
  useEffect(() => {
    getHello()
      .then(setHello)
      .catch(console.error)
  }, [])

  // If user not logged in → show login page
  if (!isLoggedIn) {
  return <LoginPage onLogin={(userRole) => 
    {setIsLoggedIn(true)
   setRole(userRole)
  }} />
}
// const path = window.location.pathname;

// FIRST check special pages


// THEN show dashboards
if (role === "Donor") {
  return <DonorDashboard />
}

if (role === "Organization Member") {
  return <OrgDashboard />
}
/*
if (path === "/request") {
  return <RequestForm />
}*/
  // Original template page (kept for now)
  return (
    <>
      <h1>{hello}</h1>

      <p className="welcome">
        Welcome to the Hack4Change workshop application.
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