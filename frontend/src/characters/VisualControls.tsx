import { useEffect } from "react";

interface KeysProps {
    keysPressed: { [key: string]: boolean };
}

const VisualControls = ({ keysPressed }: KeysProps) => {
    const simulateKeyPress = (value: string) => {
        const event1 = new KeyboardEvent("keydown", { key: 'w', code: value });
        console.log(value);
        window.dispatchEvent(event1);
    };
    return (
        <div style={{ "fontFamily": "Open Sans", position: "absolute", bottom: "10px", right: "10px", backgroundColor: "transparent", color: "grey" }}>
            <div style={{ "display": "flex", "flexDirection": "column", "alignItems": "center" }}>
                <div id="buttonRow">
                    <div className="W-button" id="eachButton" onClick={(e) => { e.preventDefault(); simulateKeyPress("KeyW") }}>W</div>
                </div>
                <div style={{ "display": "flex", "flexDirection": "row" }}>
                    <div className="A-button" id="eachButton" onClick={(e) => simulateKeyPress("KeyA")}>A</div>
                    <div className="S-button" id="eachButton" onClick={(e) => simulateKeyPress("KeyS")}>S</div>
                    <div className="D-button" id="eachButton" onClick={(e) => simulateKeyPress("KeyD")}>D</div>
                </div>
            </div>
        </div>
    )
}
export default VisualControls;