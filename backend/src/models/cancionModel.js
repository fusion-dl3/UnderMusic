const { getDatabase } = require('../config/database');

function getCancionesCollection() {
  const database = getDatabase();

  return database.collection('canciones');
}

async function crearIndicesCanciones() {
  const canciones = getCancionesCollection();

  await canciones.createIndex({ usuarioId: 1 });

  await canciones.createIndex({
    fechaPublicacion: -1
  });

  await canciones.createIndex({
    generoPrincipal: 1
  });
}

module.exports = {
  getCancionesCollection,
  crearIndicesCanciones
};