const { getDatabase } = require('../config/database');

function getMeGustasCollection() {
  const database = getDatabase();

  return database.collection('meGustasCanciones');
}

async function crearIndicesMeGustas() {
  const meGustas = getMeGustasCollection();

  await meGustas.createIndex(
    {
      usuarioId: 1,
      cancionId: 1
    },
    {
      unique: true
    }
  );

  await meGustas.createIndex({
    cancionId: 1
  });
}

module.exports = {
  getMeGustasCollection,
  crearIndicesMeGustas
};