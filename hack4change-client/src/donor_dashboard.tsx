import "./App.css"
import { useState } from "react"
import ChooseOrganization from "./choose_organization"


export default function DonorDashboard() {
  const [showOrganizations, setShowOrganizations] = useState(false)

  const requests = [
    {
      id: 1,
      title: "Fruit",
      description: "Fresh fruit needed for the community shelter."
    },
    {
      id: 2,
      title: "2 Beds",
      description: "Two beds are required for a newly arrived family."
    },
    {
      id: 3,
      title: "Blankets",
      description: "Warm blankets are needed during the cold season."
    }
  ]

  if (showOrganizations) {
  return <ChooseOrganization />
}

  return (
    <div>

      {/* NAVBAR */}
      <div className="navbar">

        <div className="logo">
          HopeBridge
        </div>

        <div className="nav-items">

          <button className="nav-btn">
            My Resources
          </button>

          <span className="icon">🔔</span>

          <span className="icon">👤</span>

        </div>

      </div>

      {/* MAIN CONTENT */}
      <div className="container">

        {/* REQUEST LIST */}
        <div className="requests">

          <h2>Requests</h2>

          {requests.map((req) => (

            <div className="request-card" key={req.id}>

              <div className="request-info">

                <div className="emergency-icon">
                  ⚠
                </div>

                <div className="request-text">

                  <div className="request-title">
                    Request for <strong>{req.title}</strong>
                  </div>

                  <div className="request-description">
                    {req.description}
                  </div>

                </div>

              </div>

              <div className="request-action">
                <button className="donate-btn">
                  Donate
                </button>
              </div>

            </div>

          ))}

        </div>

        {/* SIDE PANEL */}
        <div className="side-panel">

          <button 
          className="donate-main"
          onClick={() => setShowOrganizations(true)}
          >
            Donate
          </button>

          <p className="donate-description">
            Support organizations by donating food, furniture, or other
            essential resources needed by the community.
          </p>

        </div>

      </div>

    </div>
  )
}