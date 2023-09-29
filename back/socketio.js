const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server,{
    cors:{
      origin:["http://127.0.0.1:5501"],
    }
  }
);

const cors = require('cors');
app.use(cors({
    origin: '*'
}));

app.get('/startMovement', (req, res) => {
  io.emit("sendMarkerData",req.query.marker)
  res.send('index.html');
});


app.get('/markersPosition', (req, res) => {
  io.emit("displayMarkers",req.query.markers)
});


io.on('connection', (socket) => {
  console.log('a user connected');
  socket.emit('welcome', { message: 'Welcome!', id: socket.id });
});

server.listen(3000, () => {
  console.log('listening on http://localhost:3000');
});