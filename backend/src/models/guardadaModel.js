
const { getDatabase } = require('../config/database');

function getGuardadasCollection() {
  const database = getDatabase();

  return database.collection('cancionesGuardadas');
}

async function crearIndicesGuardadas() {
  const guardadas = getGuardadasCollection();

  // Un usuario solo puede guardar una vez la misma canción.
  await guardadas.createIndex(
    { usuarioId: 1, cancionId: 1 },
    { unique: true }
  );

  // Facilita las consultas de canciones guardadas.
  await guardadas.createIndex({
    cancionId: 1,
  });
}

module.exports = {
  getGuardadasCollection,
  crearIndicesGuardadas,
};
