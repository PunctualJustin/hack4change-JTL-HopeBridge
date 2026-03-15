import { useState } from "react"
import { useLocation }  from "react-router-dom"
import "../App.css"
import Navbar from "./navbar"

export default function ResourceForm() {
  const { state } = useLocation()
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

      <Navbar />

      <div className="form-container">

        <div className="form-title">
          { state.form_type == 'donate' ? "Donation" : "Request" }
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

          <button className="submit-btn" type="submit">
            Finalize { state.form_type == 'donate' ? "Donation" : "Request" }
          </button>

        </form>

      </div>

      {submitted && (
        <div className="popup">

          <div className="popup-box">
            <p>
            { state.form_type == 'donate' ? 
              "We've posted the availability of your generous donation. An organization will let you know as soon as they are in need." :
              "We've posted your request. One of our generous doners will let you know as soon as something is available that meets your needs."
            }
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