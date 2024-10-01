import express from "express";
import { Server } from "socket.io";
import { createServer } from "node:http";
import cors from "cors";

const app = express();
const port = 8000;
const server = createServer(app);
const players = [];
const MAX_PLAYERS_PER_LOBBY = 4;
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
let numberToGuess = 0;
const lobbies = [];

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("join_room", (data) => {
    console.log("room joined !")
    const lobby = lobbies.find((lobby) => lobby.id === data.lobbyId);
    if (
      lobby &&
      lobby.gameStatus === "waiting" &&
      lobby.players.length < MAX_PLAYERS_PER_LOBBY
    ) {
      lobby.players.push({ roomId: socket.id, player: data.username });
      socket.join(data.lobbyId);
      io.in(data.room).emit("players_list", lobby.players);
      socket.emit("joined");
    } else {
      socket.emit("lobby_full_or_closed");
    }
  });

  socket.on("create_lobby", (data) => {
    console.log(data)
    const lobbyId = lobbies.length + 1;
    const newLobby = {
      lobbyId,
      players: [],
      gameStatus: "waiting",
      name: data.lobbyname,
    };
    newLobby.players.push({ roomId: socket.id, player: data.username });
    lobbies.push(newLobby);
    socket.join(lobbyId);
    io.to(lobbyId).emit("lobby_created", { lobbyId });
    const availableLobbies = lobbies.filter(
      (lobby) => lobby.gameStatus === "waiting"
    );
    console.log("lobby id :",lobbyId)
    socket.emit("lobby_id", lobbyId);
    io.emit("lobbies_list", availableLobbies);
  });

  socket.on("get_lobbies", () => {
    const availableLobbies = lobbies.filter(
      (lobby) => lobby.gameStatus === "waiting"
    );
    socket.emit("lobbies_list", availableLobbies);
  });

  socket.on("launch_game", (data) => {
    console.log("data",data);
    console.log(lobbies)
    const lobby = lobbies.find((lobby) => lobby.id === data.lobbyId);
    lobby.gameStatus="playing";
    numberToGuess = generateRandomNumber(1, 1000);
    console.log("Number to guess: ", numberToGuess);
    console.log(lobby)
    io.in(lobby.name).emit("number_to_guess", numberToGuess);

    const firstPlayer = getFirstPlayerToPlay(lobby.players);

    io.to(firstPlayer.roomId).emit("your_turn", { message: "It's your turn!" });
  });

  socket.on("guess_number", (data) => {
    console.log("Player guessed: ", data.guess);

    if (data.guess === numberToGuess) {
      const index = players.findIndex((player) => player.roomId === socket.id);
      io.in(data.lobbyId).emit("victory", index);
    } else {
      if (data.guess < numberToGuess) {
        socket.emit("hint", { message: "Too low!" });
      } else if (data.guess > numberToGuess) {
        socket.emit("hint", { message: "Too high!" });
      }

      const nextPlayerId = getNextPlayer(socket.id);
      io.to(nextPlayerId).emit("your_turn", { message: "It's your turn!" });
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnected!");
    lobbies.forEach((lobby) => {
      const index = lobby.players.findIndex(
        (player) => player.roomId === socket.id
      );
      if (index !== -1) {
        players.splice(index, 1);
        if (lobby.players.length === 0) {
          const lobbyIndex = lobbies.findIndex((l) => l.id === lobby.id);
          lobbies.splice(lobbyIndex, 1);
        }
      }
    });
  });
});

server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

const generateRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getFirstPlayerToPlay = (lobbyPlayers) => {
  const randomIndex = Math.floor(Math.random() * lobbyPlayers.length);
  return lobbyPlayers[randomIndex];
};

const getNextPlayer = (currentPlayerId) => {
  const currentIndex = players.findIndex(
    (player) => player.roomId === currentPlayerId
  );
  const nextIndex = (currentIndex + 1) % players.length;
  return players[nextIndex].roomId;
};
