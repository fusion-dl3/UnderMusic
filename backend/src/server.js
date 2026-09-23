require('dotenv').config();

const express = require('express');

const { connectDatabase } = require('./config/database');
const { crearIndicesUsuarios } = require('./models/usuarioModel');
const usuarioRoutes = require('./routes/usuarioRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'API de UnderMusic funcionando correctamente'
  });
});

app.use('/api/usuarios', usuarioRoutes);

async function startServer() {
  try {
    await connectDatabase();
    await crearIndicesUsuarios();

    app.listen(PORT, () => {
      console.log(`Servidor de UnderMusic ejecutandose en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar UnderMusic:', error.message);
    process.exit(1);
  }
}

startServer();