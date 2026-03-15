import "../App.css"

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

            </div>

        </div>
    )
}