import "../App.css"
import { useNavigate } from "react-router-dom";

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

interface Props {
    id: number;
    title: string;
    description: string;
}

export default function ResourceCard( props:Props ) {
    const navigate = useNavigate()

    return (
        <div className="request-card" key={props.id}>

            <div className="request-info">

                <div className="emergency-icon">
                    ⚠
                </div>

                <div className="request-text">

                    <div className="request-title">
                        Request for <strong>{props.title}</strong>
                    </div>

                    <div className="request-description">
                        {props.description}
                    </div>

                </div>

                <button className="donate-card" onClick={() => navigate('/resource-form', {
                    state: {
                        form_type: 'donate',
                        item_info: props
                    }
                })}>
                    Donate
                </button>

            </div>

        </div>
    )
}