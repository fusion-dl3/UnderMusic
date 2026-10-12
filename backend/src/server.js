
require('dotenv').config();

const express = require('express');

const { connectDatabase } = require('./config/database');

const { crearIndicesUsuarios } = require('./models/usuarioModel');
const { crearIndicesPerfilesArtista } = require('./models/perfilArtistaModel');
const { crearIndicesCanciones } = require('./models/cancionModel');
const { crearIndicesSeguimientos } = require('./models/seguimientoModel');
const { crearIndicesMeGustas } = require('./models/meGustaModel');
const { crearIndicesGuardadas } = require('./models/guardadaModel');

const usuarioRoutes = require('./routes/usuarioRoutes');
const perfilArtistaRoutes = require('./routes/perfilArtistaRoutes');
const cancionRoutes = require('./routes/cancionRoutes');
const seguimientoRoutes = require('./routes/seguimientoRoutes');
const meGustaRoutes = require('./routes/meGustaRoutes');
const guardadaRoutes = require('./routes/guardadaRoutes');

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
app.use('/api/canciones', cancionRoutes);
app.use('/api/seguimientos', seguimientoRoutes);
app.use('/api/me-gustas', meGustaRoutes);
app.use('/api/guardadas', guardadaRoutes);

async function startServer() {
  try {
    await connectDatabase();

    await crearIndicesUsuarios();
    await crearIndicesPerfilesArtista();
    await crearIndicesCanciones();
    await crearIndicesSeguimientos();
    await crearIndicesMeGustas();
    await crearIndicesGuardadas();

    app.listen(PORT, () => {
      console.log(
        `Servidor de UnderMusic ejecutandose en http://localhost:${PORT}`
      );
    });

  } catch (error) {
    console.error('Error al iniciar UnderMusic:', error.message);
    process.exit(1);
  }
}

startServer();
