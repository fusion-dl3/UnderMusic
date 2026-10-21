
const { getDatabase } = require('../config/database');

function getReproduccionesCollection() {
  const database = getDatabase();

  return database.collection('reproducciones');
}

async function crearIndicesReproducciones() {
  const reproducciones = getReproduccionesCollection();

  // Consultar el historial de un usuario,
  // comenzando por sus escuchas más recientes.
  await reproducciones.createIndex({
    usuarioId: 1,
    fechaEscucha: -1
  });

  // Calcular reproducciones recientes por artista.
  await reproducciones.createIndex({
    artistaId: 1,
    fechaEscucha: -1
  });

  // Consultar reproducciones de una canción.
  await reproducciones.createIndex({
    cancionId: 1,
    fechaEscucha: -1
  });

  // Calcular oyentes únicos por artista.
  await reproducciones.createIndex({
    artistaId: 1,
    usuarioId: 1
  });
}

module.exports = {
  getReproduccionesCollection,
  crearIndicesReproducciones
};
