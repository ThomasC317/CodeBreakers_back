import express from "express";
import { Server } from "socket.io";
import { createServer } from "node:http";
import cors from "cors";

const app = express();
const port = 8000;
const server = createServer(app);
const players = [];
const socketLobbies = new Map();
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
    const lobby = lobbies.find((lobby) => lobby.lobbyId === data.lobbyId);
    if (
      lobby &&
      lobby.gameStatus === "waiting" &&
      lobby.players.length < MAX_PLAYERS_PER_LOBBY
    ) {
      lobby.players.push({ roomId: socket.id, player: data.username });

      socket.join(data.lobbyId);
      socketLobbies.set(socket.id, data.lobbyId);
      socket.emit("joined");
      io.in(lobby.lobbyId).emit("players_list", lobby.players);
    } else {
      socket.emit("lobby_full_or_closed");
    }
  });

  socket.on("create_lobby", (data) => {
    const lobbyId = lobbies.length + 1;
    const newLobby = {
      lobbyId,
      players: [],
      gameStatus: "waiting",
      name: data.lobbyname,
      numberToGuess: 0,
    };
    newLobby.players.push({ roomId: socket.id, player: data.username });
    lobbies.push(newLobby);
    socket.join(lobbyId);

    socket.emit("joined");
    const availableLobbies = lobbies.filter(
      (lobby) => lobby.gameStatus === "waiting"
    );
    socketLobbies.set(socket.id, lobbyId);
    socket.emit("players_list", newLobby.players);
    io.emit("lobbies_list", availableLobbies);
  });

  socket.on("get_lobbies", () => {
    const availableLobbies = lobbies.filter(
      (lobby) => lobby.gameStatus === "waiting"
    );
    socket.emit("lobbies_list", availableLobbies);
  });

  socket.on("launch_game", () => {
    const lobbyId = socketLobbies.get(socket.id);
    const lobby = lobbies.find((lobby) => lobby.lobbyId === lobbyId);
    console.log(lobby);
    lobby.gameStatus = "playing";
    io.in(lobbyId).emit("game_launched");

    const numberToGuess = generateRandomNumber(1, 1000);
    console.log(numberToGuess);
    io.in(lobbyId).emit("number_to_guess", numberToGuess);
    lobby.numberToGuess = numberToGuess;
    io.in(lobbyId).emit("player_list", lobby.players);

    const firstPlayer = getFirstPlayerToPlay(lobby.players);
    console.log(firstPlayer);

    if (firstPlayer && firstPlayer.roomId) {
      io.to(firstPlayer.roomId).emit("your_turn", {
        message: "It's your turn!",
      });
      io.in(lobbyId).emit("current_player", { player: firstPlayer.player });
    }

    const availableLobbies = lobbies.filter(
      (lobby) => lobby.gameStatus === "waiting"
    );
    io.emit("lobbies_list", availableLobbies);
  });

  socket.on("guess_number", (data) => {
    const lobbyId = socketLobbies.get(socket.id);
    const lobby = lobbies.find((lobby) => lobby.lobbyId === lobbyId);

    if (!lobby) return;

    if (data.guess === lobby.numberToGuess) {
      const index = lobby.players.findIndex(
        (player) => player.roomId === socket.id
      );

      io.in(lobbyId).emit("victory", { player: lobby.players[index].player });
    } else {
      if (data.guess < lobby.numberToGuess) {
        socket.emit("hint", { message: "Too low!" });
      } else if (data.guess > lobby.numberToGuess) {
        socket.emit("hint", { message: "Too high!" });
      }

      let nextPlayerId = getNextPlayer(socket.id, lobby.players);

      if (nextPlayerId) {
        io.to(nextPlayerId.roomId).emit("your_turn", {
          message: "It's your turn!",
        });

        io.in(lobbyId).emit("current_player", { player: nextPlayerId.player });
      }
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

const getNextPlayer = (currentPlayerId, lobbyPlayers) => {
  const currentIndex = lobbyPlayers.findIndex(
    (player) => player.roomId === currentPlayerId
  );
  const nextIndex = (currentIndex + 1) % lobbyPlayers.length;
  return lobbyPlayers[nextIndex];
};
