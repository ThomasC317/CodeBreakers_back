import express from "express"
import { Server } from "socket.io";

const app = express();
const port = 8000;
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

io.on('connection', (socket) => {
    console.log('a user connected');
  });
