import express from "express"
import { Server } from "socket.io";
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import cors from 'cors'

const app = express();
const port = 8000;
const server = createServer(app);
const players = [];
const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

app.use(cors({
      origin: 'http://localhost:3000'
}));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on("join_room", (data)=> {
        console.log('a player joined the room',data);
        socket.join(data.room);
        
        players.push({roomId: socket.id,player:data.username})
        
        io.in(data.room).emit('players_list', players);
        
        socket.emit("joined !")
    })

    socket.on("disconnect",()=> {
        console.log("disconnected !")
   
        const index = players.findIndex(player => player.roomId === socket.id)
        console.log(index)
        if (index !== -1)
          players.splice(index,1)
    })
  });

  server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

