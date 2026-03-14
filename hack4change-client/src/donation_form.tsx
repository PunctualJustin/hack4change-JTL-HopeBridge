import { useState } from "react"
import "./App.css"

interface Props {
  organization: string
}

export default function DonationForm({ organization }: Props) {

  const [itemName, setItemName] = useState("")
  const [description, setDescription] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("number")
  const [expirationDate, setExpirationDate] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    setSubmitted(true)
  }

  return (
    <div>

      <div className="navbar">
        <div className="logo">HopeBridge</div>
      </div>

      <div className="form-container">

        <div className="form-title">
          Donation to <strong>{organization}</strong>
        </div>

        <form onSubmit={handleSubmit}>

          <label>Item Name</label>
          <input
            type="text"
            placeholder="Example: Apples"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />

          <label>Description</label>
          <textarea
            placeholder="Optional description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <label>Quantity</label>

          <div className="quantity-row">
            <input
              type="number"
              placeholder="Amount"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />

            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option>kg</option>
              <option>number</option>
            </select>
          </div>

          <label>Expiration Date (Optional)</label>

          <input
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
          />

          <button className="submit-btn">
            Finalize Donation
          </button>

        </form>

      </div>

      {submitted && (
        <div className="popup">

          <div className="popup-box">

            <h3>Donation Confirmed 🎉</h3>

            <p>
              Your donation has been sent to <strong>{organization}</strong>.
            </p>

            <button onClick={() => setSubmitted(false)}>
              Close
            </button>

          </div>

        </div>
      )}

    </div>
  )
}