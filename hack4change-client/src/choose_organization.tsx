import { useState } from "react"
import "./App.css"
import DonationForm from "./donation_form"

export default function ChooseOrganization() {

  const [search, setSearch] = useState("")
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)

  const organizations = [
    { name: "ANY", logo: "" },

    { name: "Ability NB", logo: "https://abilitynb.ca/wp-content/uploads/2020/07/logo.png" },
    { name: "Alternative Residence Inc.", logo: "" },
    { name: "Beauséjour Community Mental Health Centre", logo: "" },
    { name: "City of Moncton", logo: "https://www.moncton.ca/sites/default/files/moncton_logo.png" },
    { name: "Crossroads for Women Inc.", logo: "" },
    { name: "Ensemble Greater Moncton", logo: "" },
    { name: "Harvest House Atlantic", logo: "" },
    { name: "Horizon Health – Mental Health and Addictions", logo: "" },
    { name: "House of Nazareth", logo: "" },
    { name: "Housing NB", logo: "" },
    { name: "Human Development Council", logo: "" },
    { name: "Humanity Project", logo: "" },
    { name: "John Howard Society of Southeastern NB", logo: "" },
    { name: "PEAR", logo: "" },
    { name: "RCMP-Community Police", logo: "" },
    { name: "Rising Tide", logo: "" },
    { name: "Salvus", logo: "" },
    { name: "Shelter Movers", logo: "" },
    { name: "South East Regional Service Commission", logo: "" },
    { name: "Town of Riverview", logo: "" },
    { name: "United Way of Greater Moncton and SENB", logo: "" },
    { name: "Ville de Dieppe", logo: "" },
    { name: "Vitalité – Public Health and Mental Health", logo: "" },
    { name: "YMCA Greater Moncton", logo: "" },
    { name: "Youth Impact Jeunesse Inc.", logo: "" },
    { name: "YWCA Moncton", logo: "" }
  ]

  const filtered = organizations.filter(org =>
    org.name.toLowerCase().includes(search.toLowerCase())
  )

  if (selectedOrg) {
  return <DonationForm organization={selectedOrg} />
}

  return (
    <div>

      <div className="navbar">
        <div className="logo">HopeBridge</div>
      </div>

      <h2 className="page-title">
        Choose Where You Want to Donate
      </h2>

      <div className="search-bar">

        <input
          type="text"
          placeholder="Search organization..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

      </div>

      <div className="grid-container">

        {filtered.map((org, index) => (

          <div 
          key={index} 
          className="card"
          onClick={() => setSelectedOrg(org.name)}
          >

            {org.logo && (
              <img src={org.logo} alt={org.name} />
            )}

            <div className="card-name">
              {org.name}
            </div>

          </div>

        ))}

      </div>

    </div>
  )
}