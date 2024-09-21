const http = require("http");
const socketIO = require("socket.io");

const server = http.createServer();

const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const initLiveCompilerSockets = require("./liveCompilerSockets");
initLiveCompilerSockets(io);

const initAIAssistantSockets = require("./AiAssistant.js"); 
initAIAssistantSockets(io);

io.on("connection", (socket) => {
  socket.on("join", ({ classId, userData }) => {
    socket.join(classId);
  });

  socket.on("chat-message", (message) => {
    io.to(message.classId).emit("chat-message", message);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
