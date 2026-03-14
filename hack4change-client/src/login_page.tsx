import { useState } from "react"
import "./App.css"

interface Props {
  onLogin: (role: string) => void
}

export default function LoginPage({ onLogin }: Props) {

  const [role, setRole] = useState<string | null>(null)
  const [mode, setMode] = useState<"login" | "signup">("login")

  const openLogin = (selectedRole: string) => {
    setRole(selectedRole)
  }

  return (
    <div className="auth-container">

      {/* Role selection */}
      {!role && (
        <div className="role-buttons">
          <button onClick={() => openLogin("Donor")}>
            Donor
          </button>

          <button onClick={() => openLogin("Organization Member")}>
            Organization Member
          </button>
        </div>
      )}

      {/* Login / Signup form */}
      {role && (
        <div className="login-box">

          <h2>{role} {mode === "login" ? "Login" : "Sign Up"}</h2>

          <input type="email" placeholder="Email" />

          <input type="password" placeholder="Password" />

          {mode === "signup" && (
            <input type="text" placeholder="Full Name" />
          )}

          
          <button 
          className="login-btn"
          onClick={() => onLogin(role || "")}
          >
            {mode === "login" ? "Login" : "Create Account"}
          </button>

          <div className="signup">

            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <span onClick={() => setMode("signup")}>
                  Sign Up
                </span>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <span onClick={() => setMode("login")}>
                  Login
                </span>
              </>
            )}

          </div>

        </div>
      )}

    </div>
  )
}