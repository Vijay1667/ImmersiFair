import { useEffect, useState } from "react";
import { socket } from "./socket";

const TextChat = ({ userName }: { userName: string }) => {
    var [isDisabled, setIsDisabled] = useState(true)
    const MessageTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log(event);
        if (event.target.value === "") {
            setIsDisabled(true);
        }
        else {
            setIsDisabled(false)
        }
    }
    const loadChatListeners = () => {
        console.log("THE RECEIVED USERNAME IS: " + userName);

        socket.on("message", ({ text, user }) => {
            console.log(text, user);
            if (userName === user) {
                const messageDiv = document.createElement("div");
                messageDiv.className = "text-chat-each-message text-chat-each-message-right";
                messageDiv.innerHTML = `<span>${userName}:</span> <span>${text}</span>`;
                document.getElementsByClassName("text-chat-history")[0].appendChild(messageDiv);

            }
            else {
                const messageDiv = document.createElement("div");
                messageDiv.className = "text-chat-each-message";
                messageDiv.innerHTML = `<span>${userName}:</span> <span>${text}</span>`;
                document.getElementsByClassName("text-chat-history")[0].appendChild(messageDiv);
            }

        })
    }
    useEffect(() => {
        loadChatListeners();
        // Clean up to avoid duplicate listeners
        return () => {
            socket.off("message");
        };
    }, [userName])
    const SendMessage = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!isDisabled) {
            console.log(userName);

            var element = document.getElementById("immersiChat") as HTMLInputElement
            socket.emit("sendMessage", { userName, text: element.value })
        }
    }
    return (
        <>
            <div className="text-chat">
                <div className="text-chat-header">
                    <div className="text-chat-heading">
                        Chat
                    </div>
                    <div className="text-chat-controls px-2">
                        <div onClick={() => {
                            console.log("CLICKED");
                            console.log(document.getElementsByClassName("text-chat")[0]);

                            (document.getElementsByClassName("text-chat")[0] as HTMLElement).style.width = "200px"; (document.getElementsByClassName("text-chat")[0] as HTMLElement).style.height = "38px"
                        }} className="text-chat-minimize">–</div>
                    </div>
                </div>
                <div className="text-chat-body">
                    <div className="text-chat-history">
                        {/* <div className="text-chat-each-message text-chat-each-message-right">
                            <span>{socket.id}:</span> <span>Hello, this is testing</span>
                        </div> */}

                    </div>
                </div>
                <div className="text-chat-send">
                    <div className="text-chat-message">
                        <input id="immersiChat" onChange={MessageTypeChange} type="text" placeholder="Enter your message" />
                    </div>
                    <button onClick={SendMessage} disabled={isDisabled} className="btn text-chat-send-button" title="Send Message">
                        <svg width="36" height="36" viewBox="0 0 58 58" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="29" cy="29" r="29" fill="#FFA500" />
                            <path d="M18.6131 17.0174C18.6131 16.6042 18.6131 15.7779 20.0787 15.7778C21.9631 15.7778 42.9007 26.5209 44.3663 27.7605C45.5388 28.7521 44.9924 29.8264 44.3643 30.2396C42.8991 31.4789 21.7629 42.2158 20.0767 42.2223C18.6111 42.2223 18.6111 41.3959 18.6111 40.9827L20.0782 31.8924C20.2452 30.9007 20.7065 30.6528 20.9163 30.6528L33.4788 29.4132C33.6184 29.4132 33.8975 29.3306 33.8975 29.0001C33.8975 28.6695 33.6184 28.5869 33.4788 28.5869L20.9163 27.3473C20.7065 27.3473 20.2452 27.0994 20.0782 26.1077C19.5878 23.1113 18.6131 17.4306 18.6131 17.0174Z" fill="white" />
                        </svg>


                    </button>
                </div>
            </div>
        </>
    )
}

export default TextChat;