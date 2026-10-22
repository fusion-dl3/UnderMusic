
const { ObjectId } = require('mongodb');
const { getReproduccionesCollection } = require('../models/reproduccionModel');

function convertirObjectId(valor, nombre = 'identificador') {
  if (valor instanceof ObjectId) return valor;

  if (typeof valor !== 'string' || !/^[a-f\d]{24}$/i.test(valor)) {
    throw new Error(`El ${nombre} no es válido`);
  }

  return new ObjectId(valor);
}

// Las reproducciones de esta colección ya fueron registradas por el
// reproductor después de cumplir el umbral de 30 segundos.
// No se cuentan eventos de pausa.
async function obtenerEstadisticasArtista(artistaId) {
  const id = convertirObjectId(artistaId, 'identificador del artista');

  const [resultado] = await getReproduccionesCollection().aggregate([
    { $match: { artistaId: id } },
    {
      $group: {
        _id: null,
        reproduccionesTotales: { $sum: 1 },
        oyentes: { $addToSet: '$usuarioId' },
      },
    },
    {
      $project: {
        _id: 0,
        reproduccionesTotales: 1,
        oyentesTotales: { $size: '$oyentes' },
      },
    },
  ]).toArray();

  return resultado || {
    reproduccionesTotales: 0,
    oyentesTotales: 0,
  };
}

async function obtenerEstadisticasCancion(cancionId) {
  const id = convertirObjectId(cancionId, 'identificador de la canción');

  const [resultado] = await getReproduccionesCollection().aggregate([
    { $match: { cancionId: id } },
    {
      $group: {
        _id: null,
        reproduccionesTotales: { $sum: 1 },
        oyentes: { $addToSet: '$usuarioId' },
      },
    },
    {
      $project: {
        _id: 0,
        reproduccionesTotales: 1,
        oyentesUnicos: { $size: '$oyentes' },
      },
    },
  ]).toArray();

  return resultado || {
    reproduccionesTotales: 0,
    oyentesUnicos: 0,
  };
}

// Devuelve los géneros de canciones efectivamente escuchadas,
// ordenados por cantidad de reproducciones válidas.
async function obtenerGenerosEscuchados(usuarioId, limite = 5) {
  const id = convertirObjectId(usuarioId, 'identificador del usuario');

  const limiteSeguro = Math.max(
    1,
    Math.min(20, Math.trunc(limite) || 5)
  );

  return getReproduccionesCollection().aggregate([
    { $match: { usuarioId: id } },
    {
      $lookup: {
        from: 'canciones',
        localField: 'cancionId',
        foreignField: '_id',
        as: 'cancion',
      },
    },
    { $unwind: '$cancion' },
    {
      $match: {
        'cancion.generoPrincipal': {
          $type: 'string',
          $ne: '',
        },
      },
    },
    {
      $group: {
        _id: '$cancion.generoPrincipal',
        reproducciones: { $sum: 1 },
      },
    },
    {
      $sort: {
        reproducciones: -1,
        _id: 1,
      },
    },
    { $limit: limiteSeguro },
    {
      $project: {
        _id: 0,
        genero: '$_id',
        reproducciones: 1,
      },
    },
  ]).toArray();
}

// Ranking por oyentes únicos históricos.
// Un usuario que escucha 20 canciones del mismo artista
// cuenta como un solo oyente.
async function obtenerRankingOyentesArtistas(artistaIds, limite = 3) {
  if (!Array.isArray(artistaIds) || artistaIds.length === 0) {
    return [];
  }

  const ids = [
    ...new Map(
      artistaIds.map((valor) => {
        const id = convertirObjectId(
          valor,
          'identificador del artista'
        );

        return [id.toHexString(), id];
      })
    ).values(),
  ];

  const limiteSeguro = Math.max(
    1,
    Math.min(100, Math.trunc(limite) || 3)
  );

  return getReproduccionesCollection().aggregate([
    {
      $match: {
        artistaId: { $in: ids },
      },
    },
    {
      $group: {
        _id: {
          artistaId: '$artistaId',
          usuarioId: '$usuarioId',
        },
        reproducciones: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.artistaId',
        oyentesTotales: { $sum: 1 },
        reproduccionesTotales: {
          $sum: '$reproducciones',
        },
      },
    },
    {
      $sort: {
        oyentesTotales: -1,
        reproduccionesTotales: -1,
        _id: 1,
      },
    },
    { $limit: limiteSeguro },
    {
      $project: {
        _id: 0,
        artistaId: { $toString: '$_id' },
        oyentesTotales: 1,
        reproduccionesTotales: 1,
      },
    },
  ]).toArray();
}

module.exports = {
  obtenerEstadisticasArtista,
  obtenerEstadisticasCancion,
  obtenerGenerosEscuchados,
  obtenerRankingOyentesArtistas,
};
