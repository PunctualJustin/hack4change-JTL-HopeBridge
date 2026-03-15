import "../App.css"
import { useNavigate } from "react-router-dom"
import ResourceCard from "./resource_card"
import Navbar from "./navbar"

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

export default function Dashboard() {
    const navigate = useNavigate();

    return (
        <div>
            <Navbar />

            {/* MAIN CONTENT */}

            <div className="container">

                {/* REQUEST LIST */}

                <div className="requests">

                    <h2>Requests</h2>

                    {requests.map((req) => <ResourceCard {...req} />)}

                </div>

                {/* RIGHT PANEL */}

                <div >
                    <div className="side-panel">
                        {/* DONATE BUTTON */}

                        <button className="donate-main" onClick={() => navigate('/resource-form', {
                            state: {
                                form_type: 'donate'
                            }
                        })}>
                            Donate
                        </button>

                        <p className="donate-description">
                            Support other organizations by donating resources such as food,
                            furniture, or other essential items.
                        </p>
                    </div>
                    <br />
                    <br />
                    <div className="side-panel" >
                        {/* REQUEST BUTTON */}

                        <button className="request-main" onClick={() => navigate('/resource-form', {
                            state: {
                                form_type: 'request'
                            }
                        })}>
                            Requests
                        </button>

                        <p className="request-description">
                            Create a request for items your organization needs. Donors will
                            be able to see it and help.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}