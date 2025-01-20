const express = require('express');
const { Server } = require("socket.io");
const { createServer } = require('node:http');
// const { createClient } = require('redis');
var const1 = 0;
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"], // Allow specific methods
        
    }
});
const cors = require('cors');
app.use(cors());
// const redisClient = createClient();

// redisClient.on('error', err => console.log('Redis Client Error', err));

async function redisConnection() {
    await redisClient.connect();
}

async function redisTest() {
    await redisClient.set('key', 'value');
    const value = await redisClient.get('key');
    console.log(value);
}

// redisConnection();
// redisTest();
const port = 3000
const users = {}; // Store users with their sockets
const rooms = {}; // Store room assignments
app.get('/', (req, res) => {
    res.send('Hello World!')
});
var currentUsers = {}
io.on('connection', (socket) => {
    console.log('a user connected ', socket.id);
    currentUsers[socket.id] = { x: 0, z: 0 };
    // socket.join(socket.id);
    console.log('currentUsers:', currentUsers);
    // io.emit('currentUsers', Array.from(currentUsers));
    // io.emit('updateUsersPosition', currentUsers);
    console.log("EMMITED");

    const1++;
    socket.on('userReady', (data) => {
        console.log(data.userName);
        currentUsers[socket.id].userName=data.userName;
        console.log(currentUsers);
        console.log("EMITTED UPDATE USERS");
        
        io.emit('updateUsersPosition', currentUsers);
    });
    socket.on('disconnect', () => {
        console.log('user disconnected ', socket.id);
        delete currentUsers[socket.id];
        io.emit('deteleUser', socket.id);
        console.log('currentUsers:', currentUsers);
    });
    socket.on('customEvent', (data) => {
        console.log('customEvent received:', data);
    });
    socket.on('updatePosition', (data) => {
        console.log('Update position:', data);
        currentUsers[data["character"]].x =data["x"];
        currentUsers[data["character"]].z =data["z"];
        console.log(currentUsers);
        
        io.emit('updateUsersPosition', currentUsers);
    });


    // socket.on('register', (userId) => {
    //     users[userId] = socket.id;
    //     console.log(`${userId} registered with socket ID ${socket.id}`);
    // });

    socket.on('offer', ({ offer, target }) => {
        // const targetSocket = users[target];
        console.log('offer:', offer);
        console.log('target:', target);
        
        if (target) {
            io.to(target).emit('offer', { offer, sender: socket.id });
        }
    });

    socket.on('answer', ({ answer, sender }) => {
        console.log('answer:',answer);
        console.log('sender:',sender);
        io.to(sender).emit('answer', { answer });
    });

    socket.on('ice-candidate', ({ candidate, target }) => {
        // const targetSocket = users[target];
        console.log('candidate:', candidate);
        console.log('target:', target);
        var sender=socket.id;
        if (target) {
            io.to(target).emit('ice-candidate', { candidate, sender });
        }
    });
    socket.on('disconnectCall',() => {
        socket.broadcast.emit('disconnectCall');
    })

    // socket.on('disconnect', () => {
    //     const userId = Object.keys(users).find((key) => users[key] === socket.id);
    //     if (userId) {
    //         delete users[userId];
    //         console.log(`${userId} disconnected`);
    //     }
    // });
    socket.on("sendMessage",({text})=>{
        console.log(currentUsers);
        
        var user=currentUsers[socket.id].userName;
        console.log(text+" from "+user);
        io.emit("message",{text,user})
    })
});

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});