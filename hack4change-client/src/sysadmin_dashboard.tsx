import { useState } from "react"
import "./App.css"

export default function SysAdminDashboard() {

    const requests = [
        {
            id: 1,
            title: "Blankets",
            description: "Warm blankets needed for winter shelter."
        },
        {
            id: 2,
            title: "Canned Food",
            description: "Food supplies required for the weekly food program."
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
                        System Administration
                    </button>

                    <span className="icon">🔔</span>

                    <span className="icon">👤</span>

                </div>

            </div>

            {/* MAIN CONTENT */}

            <div className="container">

                {/* REQUEST LIST */}

                <div className="requests">

                    <h2>System Requests Overview</h2>

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

                    {/* ORGANIZATION MANAGEMENT */}

                    <div className="side-panel">

                        <button className="sys-main">
                            Organizations
                        </button>

                        <p className="sys-description">
                            Manage partner organizations on the HopeBridge platform.
                            You can add new organizations, remove inactive ones,
                            and maintain the official organization list.
                        </p>

                    </div>

                    <br />
                    <br />

                    {/* ITEM MANAGEMENT */}

                    <div className="side-panel">

                        <button className="sys-main">
                            Items
                        </button>

                        <p className="sys-description">
                            Maintain the catalog of donation items available on the
                            platform such as food, clothing, hygiene kits, furniture,
                            and other essential resources.
                        </p>

                    </div>

                    <br />
                    <br />

                    {/* REQUEST MANAGEMENT */}

                    <div className="side-panel">

                        <button className="request-main">
                            Requests
                        </button>

                        <p className="request-description">
                            View all requests posted by organizations across the
                            platform and monitor activity within the system.
                        </p>

                    </div>

                </div>

            </div>

        </div>
    )
}