import { useState } from "react"
import "./App.css"

export default function MyResources() {

    const [resources, setResources] = useState([
        { id: 1, name: "Blankets", quantity: 10 },
        { id: 2, name: "Water Bottles", quantity: 25 }
    ])

    const [pendingDonations, setPendingDonations] = useState([
        { id: 1, name: "Canned Food", quantity: 15, donor: "John" },
        { id: 2, name: "Winter Jackets", quantity: 5, donor: "Sarah" }
    ])

    const [requests] = useState([
        { id: 1, name: "Beds", quantity: 2 },
        { id: 2, name: "Hygiene Kits", quantity: 20 }
    ])

    function confirmDonation(donationId: number) {

        const donation = pendingDonations.find(d => d.id === donationId)

        if (!donation) return

        // add to resources
        setResources([
            ...resources,
            { id: Date.now(), name: donation.name, quantity: donation.quantity }
        ])

        // remove from pending
        setPendingDonations(
            pendingDonations.filter(d => d.id !== donationId)
        )
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

            <div className="container">

                {/* AVAILABLE RESOURCES */}

                <div className="requests">

                    <h2>Available Resources</h2>

                    {resources.map((item) => (

                        <div className="request-card" key={item.id}>

                            <div className="request-text">

                                <div className="request-title">
                                    {item.name}
                                </div>

                                <div className="request-description">
                                    Quantity: {item.quantity}
                                </div>

                            </div>

                        </div>

                    ))}

                </div>

                {/* RIGHT PANEL */}

                <div>

                    {/* PENDING DONATIONS */}

                    <div className="side-panel">

                        <h3>Pending Donations</h3>

                        {pendingDonations.map((donation) => (

                            <div key={donation.id} className="pending-card">

                                <div>
                                    <strong>{donation.name}</strong>
                                    <p>Qty: {donation.quantity}</p>
                                    <p>Donor: {donation.donor}</p>
                                </div>

                                <button
                                    className="confirm-btn"
                                    onClick={() => confirmDonation(donation.id)}
                                >
                                    Confirm Received
                                </button>

                            </div>

                        ))}

                    </div>

                    <br />

                    {/* REQUESTED RESOURCES */}

                    <div className="side-panel">

                        <h3>Requested Resources</h3>

                        {requests.map((req) => (

                            <div key={req.id} className="request-mini">

                                <strong>{req.name}</strong>
                                <p>Quantity Needed: {req.quantity}</p>

                            </div>

                        ))}

                    </div>

                </div>

            </div>

        </div>
    )
}