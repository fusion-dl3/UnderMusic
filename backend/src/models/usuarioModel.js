const { client } = require('../config/database');

function getUsuariosCollection() {
  return client.db('undermusic').collection('usuarios');
}

async function crearIndicesUsuarios() {
  const usuarios = getUsuariosCollection();

  await usuarios.createIndex(
    { nombreUsuario: 1 },
    { unique: true }
  );

  await usuarios.createIndex(
    { correoCuenta: 1 },
    { unique: true }
  );
}

module.exports = {
  getUsuariosCollection,
  crearIndicesUsuarios
};