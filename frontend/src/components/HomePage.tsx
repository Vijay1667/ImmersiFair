import { useIsAuthenticated } from "@azure/msal-react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./AuthConfig";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
const HomePage = () => {
    const { instance } = useMsal();
    const navigate = useNavigate();
    const initialize = async()=>{
        await instance.initialize();
    }
    const isAuthenticated = useIsAuthenticated();
    useEffect(()=>{
        console.log(isAuthenticated);
        
        if(isAuthenticated){
            console.log("AUTHENTICATED");
            
            // navigate("/ImmersiFair")
        }
        else{
            initialize();
        }

    })
    return (
        <div className="home-immersifair">
            <div className="home-navbar">
                <div className="home-navbar-heading p-2">
                    ImmersiFair
                </div>
                <div className="p-3">
                    <button className="btn home-contact-button">Contact</button>
                </div>
            </div>
            <div className="hr-line"></div>
            <div className="home-body">
                <div>
                    Revolutionizing career fairs with an immersive 3D metaverse experience!
                </div>
                <div>{!isAuthenticated ? (<button className="" onClick={()=>{instance.loginRedirect(loginRequest).catch(e=>{
                        console.error(e);
                    })}}>Get Started &nbsp; ❯</button>) : (<button onClick={()=> {navigate("/ImmersiFair")}}>Immersify</button>)}
                    
                </div>
            </div>
        </div>
    )
}

export default HomePage;