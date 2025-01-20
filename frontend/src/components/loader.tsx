import { useEffect, useState } from "react";
import { GridLoader } from "react-spinners";
import { createPortal } from 'react-dom';
interface LoadingInputs {
    loadingMessage: string;
    visible: boolean
}
// export const LoaderControls = () => {
//     const [loadingMessage, setLoadingMessage] = useState("");
//     const [visible, setVisible] = useState(false);

//     const setLoadingText = (text: string) => {
//       setLoadingMessage(text); // Update the loading message
//     };

//     const show = () => {
//       setVisible(true); // Show the loader
//     };

//     const hide = () => {
//       setVisible(false); // Hide the loader
//     };

//     // Return the methods to control the loader
//     return { setLoadingText, show, hide, loadingMessage, visible };
//   };
export const Loader = ({ loadingMessage, visible }: LoadingInputs) => {
    return (
        <>
            {
                visible &&
                <div id="globalLoader"  style={{"backgroundColor":"gray", "display":"flex","transform":"45deg", "flexDirection": "column","alignItems": "center","justifyContent": "center","zIndex": 100, "width": "100vw", "height": "100vh","fontFamily":"Fira Code","position":"absolute" }}>
                    <div id="GridLoaderCustom">
                        <GridLoader />
                    </div>
                    <div>{loadingMessage}</div>
                </div>
            }
        </>

    )
}