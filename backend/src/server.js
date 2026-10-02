require('dotenv').config();

const express = require('express');

const { connectDatabase } = require('./config/database');
const { crearIndicesUsuarios } = require('./models/usuarioModel');
const {
  crearIndicesPerfilesArtista
} = require('./models/perfilArtistaModel');
const usuarioRoutes = require('./routes/usuarioRoutes');
const perfilArtistaRoutes = require('./routes/perfilArtistaRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'API de UnderMusic funcionando correctamente'
  });
});

app.use('/api/usuarios', usuarioRoutes);
app.use('/api/perfiles-artista', perfilArtistaRoutes);

async function startServer() {
  try {
    await connectDatabase();
    await crearIndicesUsuarios();
    await crearIndicesPerfilesArtista();

    app.listen(PORT, () => {
      console.log(`Servidor de UnderMusic ejecutandose en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar UnderMusic:', error.message);
    process.exit(1);
  }
}

startServer();