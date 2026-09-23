const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('La variable MONGODB_URI no esta definida');
}

const client = new MongoClient(uri);

async function connectDatabase() {
  await client.connect();

  const database = client.db('undermusic');

  await database.command({ ping: 1 });

  console.log('Conexion a MongoDB Atlas establecida correctamente');

  return database;
}

module.exports = {
  connectDatabase,
  client
};