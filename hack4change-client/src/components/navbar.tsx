import "../App.css"

export default function navbar() {
    return (
        <div className="navbar">

            <div className="logo">
                HopeBridge
            </div>

            <div className="nav-items">

                <button className="nav-btn">
                    My Activity
                </button>

                <span className="icon">🔔</span>

                <span className="icon">👤</span>

            </div>

        </div>
    )
}