import { useState } from "react";
import "./App.css";

const organizations = [
"Ability NB",
"Alternative Residence Inc.",
"Beauséjour Community Mental Health Centre",
"City of Moncton",
"Crossroads for Women Inc.",
"Ensemble Greater Moncton",
"Harvest House Atlantic",
"Horizon Health – Mental Health and Addictions",
"House of Nazareth",
"Housing NB",
"Human Development Council",
"Humanity Project",
"John Howard Society of Southeastern NB",
"PEAR",
"RCMP-Community Police",
"Rising Tide",
"Salvus",
"Shelter Movers",
"South East Regional Service Commission",
"Town of Riverview",
"United Way of Greater Moncton and SENB",
"Ville de Dieppe",
"YMCA Greater Moncton",
"YWCA Moncton"
];

const RequestForm = () => {

const [dateEnabled, setDateEnabled] = useState(false);

const submitRequest = (e:any) => {
e.preventDefault();
alert("Request submitted successfully!");
};

return (

<>
<div className="navbar">
<div className="logo">HopeBridge</div>
</div>

<div className="form-container">

<div className="form-title">
Create a Request
</div>

<form onSubmit={submitRequest}>

{/* ITEM NAME */}

<label>Item Name</label>
<input type="text" placeholder="Example: Apples" required/>

{/* DESCRIPTION */}

<label>Description</label>
<textarea placeholder="Describe what you need"></textarea>

{/* QUANTITY */}

<label>Quantity</label>
<input type="number" placeholder="Amount" required/>

{/* REQUEST DATE OPTION */}

<label>
<input
type="checkbox"
onChange={() => setDateEnabled(!dateEnabled)}
/>
 Specify a deadline
</label>

{dateEnabled && (
<>
<label>Needed before</label>
<input type="date"/>
</>
)}

{/* WHO TO ASK */}

<label>Send request to</label>

<div className="checkbox-group">

<label>
<input type="checkbox"/>
 All
</label>

<label>
<input type="checkbox"/>
 Donors
</label>

<p style={{marginTop:"10px",fontWeight:"bold"}}>
Organizations
</p>
<div className="org-grid">
{organizations.map((org,index)=>(
<label key={index}>
<input type="checkbox"/>
 {org}
</label>
))}
</div>
</div>

<button className="submit-btn">
Submit Request
</button>

</form>

</div>
</>
);

};

export default RequestForm;