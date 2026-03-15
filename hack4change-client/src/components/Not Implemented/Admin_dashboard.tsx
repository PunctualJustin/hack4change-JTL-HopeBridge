import { useState } from "react"
import "./App.css"

export default function AdminDashboard() {

    const requests = [
        {
            id: 1,
            title: "Fruit",
            description: "Fresh fruit needed for the community shelter."
        },
        {
            id: 2,
            title: "Beds",
            description: "Two beds are required for a newly arrived family."
        }
    ]

    return (
        <div>

            {/* NAVBAR */}

            <div className="navbar">

                <div className="logo">
                    HopeBridge
                </div>

                <div className="nav-items">

                    <button className="nav-btn">
                        Admin Panel
                    </button>

                    <span className="icon">🔔</span>

                    <span className="icon">👤</span>

                </div>

            </div>

            {/* MAIN CONTENT */}

            <div className="container">

                {/* REQUEST LIST */}

                <div className="requests">

                    <h2>Platform Requests</h2>

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

                        </div>

                    ))}

                </div>

                {/* RIGHT PANEL */}

                <div>

                    {/* DONATE */}

                    <div className="side-panel">

                        <button className="donate-main">
                            Donate
                        </button>

                        <p className="donate-description">
                            Support organizations by donating essential resources such as
                            food, clothing, or furniture to help people experiencing homelessness.
                        </p>

                    </div>

                    <br />
                    <br />

                    {/* REQUEST */}

                    <div className="side-panel">

                        <button className="request-main">
                            Requests
                        </button>

                        <p className="request-description">
                            View and manage requests created by organizations on the platform.
                        </p>

                    </div>

                    <br />
                    <br />

                    {/* USERS MANAGEMENT */}

                    <div className="side-panel">

                        <button className="users-main">
                            Users
                        </button>

                        <p className="users-description">
                            Manage platform users including donors and organization members.
                            You can create new users, remove accounts, or review user information.
                        </p>

                    </div>

                </div>

            </div>

        </div>
    )
}