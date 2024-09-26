import express from "express"
import { Server } from "socket.io";
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import cors from 'cors'

const app = express();
const port = 8000;
const server = createServer(app);
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
        console.log(data)
        socket.join(data);
    })
  });

  server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

