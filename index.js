import express from "express"
import { Server } from "socket.io";
import { createServer } from 'node:http';
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
let numberToGuess = 0;

app.use(cors({
      origin: 'http://localhost:3000'
}));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on("join_room", (data) => {
      console.log('a player joined the room', data);
      socket.join(data.room);
  
      players.push({ roomId: socket.id, player: data.username });
  
      io.in(data.room).emit('players_list', players);
  
      socket.emit("joined !");
    });

    socket.on("launch_game", (data) => {
      console.log("game launched!");
  
      numberToGuess = generateRandomNumber(1, 1000); 
      console.log("Number to guess: ", numberToGuess); 
  
      io.in(data.room).emit('number_to_guess', numberToGuess); 
  
      const firstPlayer = getFirstPlayerToPlay();
      
      io.to(firstPlayer.roomId).emit('your_turn', { message: "It's your turn!" }); 
    });

    socket.on("guess_number", (data) => {
      console.log('Player guessed: ', data.guess);
  
      if (data.guess === numberToGuess) {
        const index = players.findIndex(player => player.roomId === socket.id);
        io.in(data.room).emit('victory', index); 
      } else {
        if (data.guess < numberToGuess) {
          socket.emit('hint', { message: 'Too low!' });
        } else if (data.guess > numberToGuess) {
          socket.emit('hint', { message: 'Too high!' });
        }
  
        const nextPlayerId = getNextPlayer(socket.id);
        io.to(nextPlayerId).emit('your_turn', { message: "It's your turn!" }); 
      }
    });

    socket.on("disconnect", () => {
      console.log("disconnected!");
  
      const index = players.findIndex(player => player.roomId === socket.id);
      if (index !== -1) players.splice(index, 1);
  
      io.emit('players_list', players); 
    });
  });

  server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

const generateRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getFirstPlayerToPlay = () => {
  const randomIndex = Math.floor(Math.random() * players.length);
  return players[randomIndex];
};

const getNextPlayer = (currentPlayerId) => {
  const currentIndex = players.findIndex(player => player.roomId === currentPlayerId);
  const nextIndex = (currentIndex + 1) % players.length; 
  return players[nextIndex].roomId;
};
