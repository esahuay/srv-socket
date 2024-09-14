const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true // Permitir credenciales
}));

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true // Permitir credenciales
  }
});

const maxUsersInPurchase = 3;
let usersInPurchase = [];
let queue = [];
let chatMessages = [];  // Array para almacenar mensajes

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Enviar los mensajes previos del chat al usuario que se conecta
  socket.emit('previousMessages', chatMessages);

  // Evento para manejar los mensajes del chat
  socket.on('sendMessage', (message) => {
    console.log('Mensaje recibido en el servidor:', message);
    const chatMessage = {
      user: socket.id,
      message,
      timestamp: new Date()
    };
    // Agregar el mensaje al array de mensajes
    chatMessages.push(chatMessage);

    // Emitir el mensaje a todos los usuarios excepto al que lo envió
    socket.broadcast.emit('newMessage', chatMessage);
  });

  // Intentar acceder a la pantalla de compra
  socket.on('joinPurchase', () => {
    
    usersInPurchase.forEach((item, id) =>
    {
      id++;
      console.log(`El item en venta es: ${item} y el id: ${id}`);
    });

    console.log(`Length cola ${queue.length}`);

    queue.forEach((item, id) =>
    {
        id++;
        console.log(`El item en cola es: ${item} y el id: ${id}`);
    });

    if (!usersInPurchase.includes(socket.id) && !queue.includes(socket.id)) {
      if (usersInPurchase.length < maxUsersInPurchase) {
        usersInPurchase.push(socket.id);
        socket.emit('accessGranted');
      } else {
        queue.push(socket.id);
        socket.emit('inQueue', { position: queue.length });
      }
    } else {
      usersInPurchase.forEach((item, id) =>
      {
        id++;
        console.log(`El item en venta -- 2 -- es: ${item} y el id: ${id}`);
      });
      if(usersInPurchase.includes(socket.id))
      {
          console.log(`Acceso Permitido`);
          socket.emit('accessGranted');
      }else{
        console.log(`Socket ${socket.id} ya está en la cola.`);
        socket.emit('inQueue', { position: queue.length });
      }
    }
  });

  // Verificar acceso a la pantalla de compra
  socket.on('checkAccess', () => {
    console.log(`Verificando la cola con el id ${socket.id}`);
    if (usersInPurchase.includes(socket.id)) {
      socket.emit('accessGranted');
    } else {
      socket.emit('accessDenied');
    }
  });

  // Desconectar un usuario
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Eliminar del array de usuarios en la pantalla de compra
    usersInPurchase = usersInPurchase.filter(id => id !== socket.id);

    // Eliminar del array de la cola
    queue = queue.filter(id => id !== socket.id);

    // Si hay alguien en la cola, pasar al siguiente usuario
    if (queue.length > 0) {
      const nextUser = queue.shift();
      io.to(nextUser).emit('accessGranted');
      usersInPurchase.push(nextUser);
      io.to(nextUser).emit('queueUpdate', { position: null });
    }
  });
});

server.listen(3001, () => {
  console.log('Server listening on port 3001');
});
