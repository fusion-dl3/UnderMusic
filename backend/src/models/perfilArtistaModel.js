const { getDatabase } = require('../config/database');

function getPerfilesArtistaCollection() {
  const database = getDatabase();

  return database.collection('perfilesArtista');
}

async function crearIndicesPerfilesArtista() {
  const perfilesArtista = getPerfilesArtistaCollection();

  await perfilesArtista.createIndex(
    { usuarioId: 1 },
    { unique: true }
  );
}

module.exports = {
  getPerfilesArtistaCollection,
  crearIndicesPerfilesArtista
};