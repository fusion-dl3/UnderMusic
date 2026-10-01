const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('La variable MONGODB_URI no esta definida');
}

const client = new MongoClient(uri);

let database = null;

async function connectDatabase() {
  await client.connect();

  database = client.db('undermusic');

  await database.command({ ping: 1 });

  console.log(
    'Conexion a MongoDB Atlas establecida correctamente'
  );

  return database;
}

function getDatabase() {
  if (!database) {
    throw new Error(
      'La base de datos aun no ha sido inicializada'
    );
  }

  return database;
}

module.exports = {
  connectDatabase,
  getDatabase,
  client
};