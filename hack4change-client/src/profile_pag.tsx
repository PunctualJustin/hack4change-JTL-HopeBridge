import { useState } from "react"
import "./App.css"

export default function ProfilePage() {

    const [editing, setEditing] = useState(false)

    const [user, setUser] = useState({
        name: "John Doe",
        email: "john@email.com",
        role: "Donor",
        organization: "None"
    })

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target
        setUser({ ...user, [name]: value })
    }

    function saveProfile() {
        setEditing(false)
        alert("Profile updated successfully")
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
                        My Profile
                    </button>

                    <span className="icon">🔔</span>

                    <span className="icon">👤</span>

                </div>

            </div>

            {/* PROFILE CONTAINER */}

            <div className="profile-container">

                <div className="profile-card">

                    <h2>User Profile</h2>

                    <div className="profile-field">

                        <label>Name</label>

                        <input
                            type="text"
                            name="name"
                            value={user.name}
                            onChange={handleChange}
                            disabled={!editing}
                        />

                    </div>

                    <div className="profile-field">

                        <label>Email</label>

                        <input
                            type="email"
                            name="email"
                            value={user.email}
                            onChange={handleChange}
                            disabled={!editing}
                        />

                    </div>

                    <div className="profile-field">

                        <label>Role</label>

                        <input
                            type="text"
                            value={user.role}
                            disabled
                        />

                    </div>

                    <div className="profile-field">

                        <label>Organization</label>

                        <input
                            type="text"
                            value={user.organization}
                            disabled
                        />

                    </div>

                    {/* BUTTONS */}

                    <div className="profile-buttons">

                        {!editing && (
                            <button
                                className="edit-btn"
                                onClick={() => setEditing(true)}
                            >
                                Edit Profile
                            </button>
                        )}

                        {editing && (
                            <>
                                <button
                                    className="save-btn"
                                    onClick={saveProfile}
                                >
                                    Save
                                </button>

                                <button
                                    className="cancel-btn"
                                    onClick={() => setEditing(false)}
                                >
                                    Cancel
                                </button>
                            </>
                        )}

                    </div>

                </div>

            </div>

        </div>
    )
}