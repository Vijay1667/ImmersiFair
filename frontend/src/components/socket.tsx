import { io, Socket } from "socket.io-client";

// Create and export a single socket instance
export const socket: Socket = io('http://localhost:3000',{transports: ['websocket']});

// Optional: Add event listeners or other setup logic here, if needed
socket.on('connect', () => {
    console.log(`Connected with socket id: ${socket.id}`);
});
