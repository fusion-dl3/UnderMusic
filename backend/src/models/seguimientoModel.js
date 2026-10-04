const { client } = require('../config/database');

function getSeguimientosCollection() {
  return client
    .db('undermusic')
    .collection('seguimientos');
}

async function crearIndicesSeguimientos() {
  const seguimientos =
    getSeguimientosCollection();

  await seguimientos.createIndex(
    {
      seguidorId: 1,
      artistaId: 1
    },
    {
      unique: true
    }
  );

  await seguimientos.createIndex({
    artistaId: 1
  });

  await seguimientos.createIndex({
    seguidorId: 1
  });
}

module.exports = {
  getSeguimientosCollection,
  crearIndicesSeguimientos
};