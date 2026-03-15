import { useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import "../App.css";
import { useAuth } from '../contexts/AuthContext.tsx';
import { postRegister } from '../api/user.ts';
import type { User } from '../api/user.ts';

export default function LoginPage(): ReactElement {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const { login } = useAuth()

  const [userState, setUserState] = useState<User>({
    email: '',
    password: '',
    tel: '',
    fullName: '',
    role: null
  });

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const name = event.target.name;
    const value = event.target.value;
    // Update the state using dynamic object keys and the spread operator
    setUserState({
      ...userState,
      [name]: value,
    });
  };

  return (
    <div className="auth-container">
      
      <div className="login-box">

        <h2>{mode === "login" ? "Login" : "Sign Up"}</h2>
        
        <input 
          type="email" 
          name="email"
          placeholder="Email" 
          value={userState.email} 
          onChange={handleInputChange}
        />
        
        <input 
          type="password"  
          name="password"
          placeholder="Password"
          value={userState.password}
          onChange={handleInputChange}
        />

        {mode === "signup" && (
          <>
            <input
              type="text" 
          name="fullName"
              placeholder="Full Name" 
              value={userState.fullName}
              onChange={handleInputChange}
            />
            <input 
              type="tel" 
              name="tel"
              placeholder="Phone Number" 
              value={userState.tel}
              onChange={handleInputChange}
            />
          </>
        )}

        <button 
          className="login-btn" 
          onClick={() => {
            mode === "login" ? 
            login(userState.email, userState.password) : 
            postRegister(userState).then().catch(console.error)
          }}
        >
          {mode === "login" ? "Login" : "Create Account"}
        </button>

        <div className="signup">

          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <span onClick={() => {
                setMode("signup")
                setUserState({
                  ...userState,
                  role: 'Donor',
                });
              }}>
                Sign Up
              </span>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <span onClick={() => {
                setMode("login")
                setUserState({
                  ...userState,
                  role: null,
                });

              }}>
                Login
              </span>
            </>
          )}

        </div>

      </div>

    </div>
  )
}