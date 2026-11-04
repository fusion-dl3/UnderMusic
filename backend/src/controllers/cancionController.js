const { intentarNotificar, notificarLanzamiento } = require('../services/notificacionesService');
const {
  GridFSBucket,
  ObjectId
} = require('mongodb');

const {
  getDatabase
} = require('../config/database');

const {
  getCancionesCollection
} = require('../models/cancionModel');

const {
  getPerfilesArtistaCollection
} = require('../models/perfilArtistaModel');

const {
  getReproduccionesCollection
} = require('../models/reproduccionModel');

const {
  getMeGustasCollection
} = require('../models/meGustaModel');

const {
  getGuardadasCollection
} = require('../models/guardadaModel');

const {
  GENEROS_MUSICALES
} = require('../constants/generos');

const {
  TAMANO_MAXIMO_MP3,
  TAMANO_MAXIMO_PORTADA
} = require('../middlewares/uploadCancionMiddleware');

function esContenidoMp3(buffer) {
  if (!buffer || buffer.length < 3) {
    return false;
  }

  const tieneId3 =
    buffer[0] === 0x49 &&
    buffer[1] === 0x44 &&
    buffer[2] === 0x33;

  const tieneSincronizacionMpeg =
    buffer.length >= 2 &&
    buffer[0] === 0xff &&
    (buffer[1] & 0xe0) === 0xe0;

  return tieneId3 || tieneSincronizacionMpeg;
}

function guardarBufferEnGridFS(
  bucket,
  nombreArchivo,
  buffer,
  metadata
) {
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(
      nombreArchivo,
      {
        metadata
      }
    );

    uploadStream.on('error', reject);

    uploadStream.on('finish', () => {
      resolve(uploadStream.id);
    });

    uploadStream.end(buffer);
  });
}

async function publicarCancion(req, res) {
  let audioId = null;
  let portadaId = null;

  try {
    if (req.usuario.rol !== 'artista') {
      return res.status(403).json({
        message:
          'Esta función está disponible solo para artistas'
      });
    }

    const archivos = req.files || {};

    const archivoAudio =
      archivos.audio?.[0] || null;

    const archivoPortada =
      archivos.portada?.[0] || null;

    if (!archivoAudio) {
      return res.status(400).json({
        message:
          'Debes seleccionar un archivo MP3'
      });
    }

    if (archivoAudio.size > TAMANO_MAXIMO_MP3) {
      return res.status(400).json({
        message:
          'El archivo MP3 no puede superar los 20 MB'
      });
    }

    if (!esContenidoMp3(archivoAudio.buffer)) {
      return res.status(400).json({
        message:
          'El contenido del archivo no corresponde a un MP3 válido'
      });
    }

    if (
      archivoPortada &&
      archivoPortada.size > TAMANO_MAXIMO_PORTADA
    ) {
      return res.status(400).json({
        message:
          'La portada no puede superar los 5 MB'
      });
    }

    const {
      titulo = '',
      album = '',
      generoPrincipal = '',
      generosSecundarios = []
    } = req.body;

    if (
      typeof titulo !== 'string' ||
      typeof album !== 'string' ||
      typeof generoPrincipal !== 'string'
    ) {
      return res.status(400).json({
        message:
          'Los datos de la canción no son válidos'
      });
    }

    const tituloNormalizado = titulo.trim();
    const albumNormalizado = album.trim();

    const generoPrincipalNormalizado =
      generoPrincipal.trim();

    if (!tituloNormalizado) {
      return res.status(400).json({
        message:
          'El título de la canción es obligatorio'
      });
    }

    if (!generoPrincipalNormalizado) {
      return res.status(400).json({
        message:
          'Debes seleccionar un género principal'
      });
    }

    if (
      !GENEROS_MUSICALES.includes(
        generoPrincipalNormalizado
      )
    ) {
      return res.status(400).json({
        message:
          'El género principal no es válido'
      });
    }

    let generosSecundariosRecibidos =
      generosSecundarios;

    if (
      typeof generosSecundariosRecibidos ===
      'string'
    ) {
      try {
        generosSecundariosRecibidos =
          JSON.parse(generosSecundariosRecibidos);
      } catch {
        return res.status(400).json({
          message:
            'Los géneros secundarios no son válidos'
        });
      }
    }

    if (
      !Array.isArray(
        generosSecundariosRecibidos
      )
    ) {
      return res.status(400).json({
        message:
          'Los géneros secundarios deben enviarse como una lista'
      });
    }

    const generosSecundariosNormalizados = [
      ...new Set(
        generosSecundariosRecibidos
          .filter(
            (genero) =>
              typeof genero === 'string'
          )
          .map((genero) => genero.trim())
          .filter(
            (genero) => genero.length > 0
          )
      )
    ];

    const generosInvalidos =
      generosSecundariosNormalizados.filter(
        (genero) =>
          !GENEROS_MUSICALES.includes(genero)
      );

    if (generosInvalidos.length > 0) {
      return res.status(400).json({
        message:
          'Uno o más géneros secundarios no son válidos'
      });
    }

    if (
      generosSecundariosNormalizados.length > 3
    ) {
      return res.status(400).json({
        message:
          'Puedes seleccionar como máximo 3 géneros secundarios'
      });
    }

    if (
      generosSecundariosNormalizados.includes(
        generoPrincipalNormalizado
      )
    ) {
      return res.status(400).json({
        message:
          'El género principal no puede repetirse como género secundario'
      });
    }

    const perfilesArtista =
      getPerfilesArtistaCollection();

    const perfilArtista =
      await perfilesArtista.findOne({
        usuarioId: new ObjectId(
          req.usuario.id
        )
      });

    if (
      !perfilArtista ||
      perfilArtista.perfilCompleto !== true
    ) {
      return res.status(400).json({
        message:
          'Debes completar tu perfil artístico antes de publicar una canción'
      });
    }

    const database = getDatabase();

    const bucketAudio =
      new GridFSBucket(database, {
        bucketName: 'audiosCanciones'
      });

    const bucketPortadas =
      new GridFSBucket(database, {
        bucketName: 'portadasCanciones'
      });

    const usuarioId =
      new ObjectId(req.usuario.id);

    const fechaPublicacion = new Date();

    const nombreAudio =
      `cancion-${req.usuario.id}-${Date.now()}.mp3`;

    audioId = await guardarBufferEnGridFS(
      bucketAudio,
      nombreAudio,
      archivoAudio.buffer,
      {
        usuarioId,
        contentType: 'audio/mpeg',
        nombreOriginal:
          archivoAudio.originalname
      }
    );

    if (archivoPortada) {
      const extensionPorMime = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp'
      };

      const extension =
        extensionPorMime[
          archivoPortada.mimetype
        ];

      const nombrePortada =
        `portada-${req.usuario.id}-${Date.now()}.${extension}`;

      portadaId =
        await guardarBufferEnGridFS(
          bucketPortadas,
          nombrePortada,
          archivoPortada.buffer,
          {
            usuarioId,
            contentType:
              archivoPortada.mimetype,
            nombreOriginal:
              archivoPortada.originalname
          }
        );
    }

    const canciones =
      getCancionesCollection();

    const nuevaCancion = {
      usuarioId,
      titulo: tituloNormalizado,
      album: albumNormalizado,
      generoPrincipal:
        generoPrincipalNormalizado,
      generosSecundarios:
        generosSecundariosNormalizados,
      audioId: audioId.toString(),
      portadaId: portadaId
        ? portadaId.toString()
        : null,
      fechaPublicacion,
      fechaActualizacion:
        fechaPublicacion
    };

    const resultado =
      await canciones.insertOne(
        nuevaCancion
      );

    await intentarNotificar(() => notificarLanzamiento(usuarioId, resultado.insertedId, nuevaCancion.titulo));

    return res.status(201).json({
      message:
        'Canción publicada correctamente',
      cancion: {
        id: resultado.insertedId,
        ...nuevaCancion
      }
    });
  } catch (error) {
    console.error(
      'Error al publicar canción:',
      error
    );

    const database = getDatabase();

    if (audioId) {
      try {
        const bucketAudio =
          new GridFSBucket(database, {
            bucketName:
              'audiosCanciones'
          });

        await bucketAudio.delete(audioId);
      } catch (errorEliminacion) {
        console.error(
          'No fue posible eliminar el audio después del error:',
          errorEliminacion
        );
      }
    }

    if (portadaId) {
      try {
        const bucketPortadas =
          new GridFSBucket(database, {
            bucketName:
              'portadasCanciones'
          });

        await bucketPortadas.delete(
          portadaId
        );
      } catch (errorEliminacion) {
        console.error(
          'No fue posible eliminar la portada después del error:',
          errorEliminacion
        );
      }
    }

    return res.status(500).json({
      message:
        'No fue posible publicar la canción'
    });
  }
}

async function subirPortadaCancion(req, res) {
  let nuevaPortadaId = null;

  try {
    if (req.usuario.rol !== 'artista') {
      return res.status(403).json({
        message:
          'Esta función está disponible solo para artistas'
      });
    }

    const { cancionId } = req.params;

    if (!ObjectId.isValid(cancionId)) {
      return res.status(400).json({
        message:
          'El identificador de la canción no es válido'
      });
    }

    const archivos = req.files || {};

    const archivoPortada =
      archivos.portada?.[0] || null;

    if (!archivoPortada) {
      return res.status(400).json({
        message:
          'Debes seleccionar una portada'
      });
    }

    if (
      archivoPortada.size >
      TAMANO_MAXIMO_PORTADA
    ) {
      return res.status(400).json({
        message:
          'La portada no puede superar los 5 MB'
      });
    }

    const canciones =
      getCancionesCollection();

    const usuarioId =
      new ObjectId(req.usuario.id);

    const cancion =
      await canciones.findOne({
        _id: new ObjectId(cancionId),
        usuarioId
      });

    if (!cancion) {
      return res.status(404).json({
        message:
          'No se encontró la canción'
      });
    }

    const database = getDatabase();

    const bucketPortadas =
      new GridFSBucket(database, {
        bucketName: 'portadasCanciones'
      });

    const extensionPorMime = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };

    const extension =
      extensionPorMime[
        archivoPortada.mimetype
      ];

    if (!extension) {
      return res.status(400).json({
        message:
          'La portada debe estar en formato JPG, PNG o WEBP'
      });
    }

    const nombrePortada =
      `portada-${req.usuario.id}-${Date.now()}.${extension}`;

    nuevaPortadaId =
      await guardarBufferEnGridFS(
        bucketPortadas,
        nombrePortada,
        archivoPortada.buffer,
        {
          usuarioId,
          cancionId:
            new ObjectId(cancionId),
          contentType:
            archivoPortada.mimetype,
          nombreOriginal:
            archivoPortada.originalname
        }
      );

    const portadaAnteriorId =
      cancion.portadaId;

    await canciones.updateOne(
      {
        _id: new ObjectId(cancionId),
        usuarioId
      },
      {
        $set: {
          portadaId:
            nuevaPortadaId.toString(),
          fechaActualizacion:
            new Date()
        }
      }
    );

    if (
      portadaAnteriorId &&
      ObjectId.isValid(portadaAnteriorId)
    ) {
      try {
        await bucketPortadas.delete(
          new ObjectId(
            portadaAnteriorId
          )
        );
      } catch (errorEliminacion) {
        console.error(
          'No fue posible eliminar la portada anterior:',
          errorEliminacion
        );
      }
    }

    return res.status(200).json({
      message:
        'Portada actualizada correctamente',
      portadaId:
        nuevaPortadaId.toString()
    });
  } catch (error) {
    console.error(
      'Error al subir portada de canción:',
      error
    );

    if (nuevaPortadaId) {
      try {
        const database = getDatabase();

        const bucketPortadas =
          new GridFSBucket(database, {
            bucketName:
              'portadasCanciones'
          });

        await bucketPortadas.delete(
          nuevaPortadaId
        );
      } catch (errorEliminacion) {
        console.error(
          'No fue posible eliminar la nueva portada después del error:',
          errorEliminacion
        );
      }
    }

    return res.status(500).json({
      message:
        'No fue posible guardar la portada'
    });
  }
}
// Obtener estadísticas por canción con consultas agrupadas, sin alterar
// las colecciones ni la lógica de registro de reproducciones/interacciones.
async function obtenerEstadisticasPorCancion(canciones) {
  const ids = canciones.map((cancion) => cancion._id);
  const estadisticas = new Map(
    ids.map((id) => [id.toString(), {
      reproducciones: 0,
      meGustas: 0,
      guardados: 0
    }])
  );

  if (ids.length === 0) return estadisticas;

  const pipeline = [
    { $match: { cancionId: { $in: ids } } },
    { $group: { _id: '$cancionId', total: { $sum: 1 } } }
  ];

  const [reproducciones, meGustas, guardados] = await Promise.all([
    getReproduccionesCollection().aggregate(pipeline).toArray(),
    getMeGustasCollection().aggregate(pipeline).toArray(),
    getGuardadasCollection().aggregate(pipeline).toArray()
  ]);

  for (const [campo, registros] of [
    ['reproducciones', reproducciones],
    ['meGustas', meGustas],
    ['guardados', guardados]
  ]) {
    for (const registro of registros) {
      const entrada = estadisticas.get(registro._id.toString());
      if (entrada) entrada[campo] = registro.total;
    }
  }

  return estadisticas;
}

async function obtenerMisCanciones(req, res) {
  try {
    if (req.usuario.rol !== 'artista') {
      return res.status(403).json({
        message:
          'Esta función está disponible solo para artistas'
      });
    }

    const canciones =
      getCancionesCollection();

    const usuarioId =
      new ObjectId(req.usuario.id);

    const cancionesEncontradas =
      await canciones
        .find({
          usuarioId
        })
        .sort({
          fechaPublicacion: -1
        })
        .toArray();

    const estadisticasPorCancion = await obtenerEstadisticasPorCancion(cancionesEncontradas);

    const resultado =
      cancionesEncontradas.map(
        (cancion) => ({
          id: cancion._id.toString(),
          titulo: cancion.titulo,
          album: cancion.album || '',
          generoPrincipal:
            cancion.generoPrincipal,
          generosSecundarios:
            cancion.generosSecundarios || [],
          audioId:
            cancion.audioId || null,
          portadaId:
            cancion.portadaId || null,
          fechaPublicacion:
            cancion.fechaPublicacion,
          fechaActualizacion:
            cancion.fechaActualizacion,
          ...estadisticasPorCancion.get(cancion._id.toString())
        })
      );

    return res.status(200).json({
      canciones: resultado
    });
  } catch (error) {
    console.error(
      'Error al obtener canciones del artista:',
      error
    );

    return res.status(500).json({
      message:
        'No fue posible obtener las canciones'
    });
  }
}

async function obtenerCancionesArtista(req, res) {
  try {
    const { usuarioId } = req.params;

    if (!ObjectId.isValid(usuarioId)) {
      return res.status(400).json({
        message:
          'El identificador del artista no es válido'
      });
    }

    const artistaObjectId =
      new ObjectId(usuarioId);

    const perfilesArtista =
      getPerfilesArtistaCollection();

    const perfilArtista =
      await perfilesArtista.findOne({
        usuarioId: artistaObjectId,
        perfilCompleto: true
      });

    if (!perfilArtista) {
      return res.status(404).json({
        message:
          'El perfil artístico no está disponible'
      });
    }

    const canciones =
      getCancionesCollection();

    const cancionesEncontradas =
      await canciones
        .find({
          usuarioId: artistaObjectId
        })
        .sort({
          fechaPublicacion: -1
        })
        .toArray();

    const estadisticasPorCancion = await obtenerEstadisticasPorCancion(cancionesEncontradas);

    const resultado =
      cancionesEncontradas.map(
        (cancion) => ({
          id: cancion._id.toString(),
          titulo: cancion.titulo,
          album: cancion.album || '',
          generoPrincipal:
            cancion.generoPrincipal,
          generosSecundarios:
            cancion.generosSecundarios || [],
          audioId:
            cancion.audioId || null,
          portadaId:
            cancion.portadaId || null,
          fechaPublicacion:
            cancion.fechaPublicacion,
          fechaActualizacion:
            cancion.fechaActualizacion,
          ...estadisticasPorCancion.get(cancion._id.toString())
        })
      );

    return res.status(200).json({
      canciones: resultado
    });
  } catch (error) {
    console.error(
      'Error al obtener canciones públicas del artista:',
      error
    );

    return res.status(500).json({
      message:
        'No fue posible obtener las canciones'
    });
  }
}

async function obtenerPortadaCancion(req, res) {
  try {
    const { portadaId } = req.params;

    if (!ObjectId.isValid(portadaId)) {
      return res.status(400).json({
        message:
          'El identificador de la portada no es válido'
      });
    }

    const database = getDatabase();

    const bucketPortadas =
      new GridFSBucket(database, {
        bucketName: 'portadasCanciones'
      });

    const archivos = await bucketPortadas
      .find({
        _id: new ObjectId(portadaId)
      })
      .toArray();

    if (archivos.length === 0) {
      return res.status(404).json({
        message:
          'No se encontró la portada'
      });
    }

    const archivo = archivos[0];

    const contentType =
      archivo.metadata?.contentType ||
      'application/octet-stream';

    res.setHeader(
      'Content-Type',
      contentType
    );

    res.setHeader(
      'Cache-Control',
      'public, max-age=86400'
    );

    const stream =
      bucketPortadas.openDownloadStream(
        new ObjectId(portadaId)
      );

    stream.on('error', (error) => {
      console.error(
        'Error al leer portada de canción:',
        error
      );

      if (!res.headersSent) {
        res.status(500).json({
          message:
            'No fue posible obtener la portada'
        });
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  } catch (error) {
    console.error(
      'Error al obtener portada de canción:',
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        message:
          'No fue posible obtener la portada'
      });
    }

    res.end();
  }
}

async function obtenerAudioCancion(req, res) {
  try {
    const { audioId } = req.params;

    if (!ObjectId.isValid(audioId)) {
      return res.status(400).json({
        message:
          'El identificador del audio no es válido'
      });
    }

    const database = getDatabase();

    const bucketAudio =
      new GridFSBucket(database, {
        bucketName: 'audiosCanciones'
      });

    const archivos = await bucketAudio
      .find({
        _id: new ObjectId(audioId)
      })
      .toArray();

    if (archivos.length === 0) {
      return res.status(404).json({
        message:
          'No se encontró el audio'
      });
    }

    const archivo = archivos[0];

    const contentType =
      archivo.metadata?.contentType ||
      'audio/mpeg';

    res.setHeader(
      'Content-Type',
      contentType
    );

    res.setHeader(
      'Content-Length',
      archivo.length
    );

    res.setHeader(
      'Accept-Ranges',
      'bytes'
    );

    res.setHeader(
      'Cache-Control',
      'public, max-age=3600'
    );

    const stream =
      bucketAudio.openDownloadStream(
        new ObjectId(audioId)
      );

    stream.on('error', (error) => {
      console.error(
        'Error al leer audio de canción:',
        error
      );

      if (!res.headersSent) {
        res.status(500).json({
          message:
            'No fue posible obtener el audio'
        });
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  } catch (error) {
    console.error(
      'Error al obtener audio de canción:',
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        message:
          'No fue posible obtener el audio'
      });
    }

    res.end();
  }
}


async function obtenerCancionPublica(req, res) {
  try {
    const { cancionId } = req.params;

    if (!ObjectId.isValid(cancionId)) {
      return res.status(400).json({
        message: 'El identificador de la canción no es válido'
      });
    }

    const canciones = getCancionesCollection();

    const cancion = await canciones.findOne({
      _id: new ObjectId(cancionId)
    });

    if (!cancion) {
      return res.status(404).json({
        message: 'No se encontró la canción'
      });
    }

    const perfilesArtista = getPerfilesArtistaCollection();

    const perfilArtista = await perfilesArtista.findOne({
      usuarioId: cancion.usuarioId,
      perfilCompleto: true
    });

    if (!perfilArtista) {
      return res.status(404).json({
        message: 'La canción no está disponible'
      });
    }

    return res.status(200).json({
      cancion: {
        id: cancion._id.toString(),
        usuarioId: cancion.usuarioId.toString(),
        titulo: cancion.titulo,
        album: cancion.album || '',
        generoPrincipal: cancion.generoPrincipal,
        generosSecundarios: cancion.generosSecundarios || [],
        audioId: cancion.audioId || null,
        portadaId: cancion.portadaId || null,
        fechaPublicacion: cancion.fechaPublicacion,
        nombreArtistico: perfilArtista.nombreArtistico
      }
    });

  } catch (error) {
    console.error(
      'Error al obtener canción pública:',
      error
    );

    return res.status(500).json({
      message: 'No fue posible obtener la canción'
    });
  }
}


async function obtenerGenerosDisponibles(req, res) {
  try {
    const canciones = getCancionesCollection();
    const perfilesArtista = getPerfilesArtistaCollection();

    // Solo consideramos artistas con perfiles completos.
    const perfilesCompletos = await perfilesArtista
      .find(
        { perfilCompleto: true },
        { projection: { usuarioId: 1 } }
      )
      .toArray();

    const idsArtistas = perfilesCompletos
      .map((perfil) => perfil.usuarioId)
      .filter(Boolean);

    if (idsArtistas.length === 0) {
      return res.status(200).json({ generos: [] });
    }

    const cancionesPublicadas = await canciones
      .find(
        { usuarioId: { $in: idsArtistas } },
        {
          projection: {
            usuarioId: 1,
            generoPrincipal: 1,
            generosSecundarios: 1
          }
        }
      )
      .toArray();

    // Cada género almacena artistas únicos, no cantidad de canciones.
    const artistasPorGenero = new Map();

    for (const cancion of cancionesPublicadas) {
      const generos = [
        cancion.generoPrincipal,
        ...(Array.isArray(cancion.generosSecundarios)
          ? cancion.generosSecundarios
          : [])
      ];

      for (const genero of new Set(generos)) {
        if (
          typeof genero !== 'string' ||
          !GENEROS_MUSICALES.includes(genero)
        ) {
          continue;
        }

        if (!artistasPorGenero.has(genero)) {
          artistasPorGenero.set(genero, new Set());
        }

        artistasPorGenero
          .get(genero)
          .add(String(cancion.usuarioId));
      }
    }

    const generos = [...artistasPorGenero.entries()]
      .map(([nombre, artistas]) => ({
        nombre,
        cantidadArtistas: artistas.size
      }))
      .sort((a, b) => {
        if (b.cantidadArtistas !== a.cantidadArtistas) {
          return b.cantidadArtistas - a.cantidadArtistas;
        }

        return a.nombre.localeCompare(b.nombre, 'es');
      });

    return res.status(200).json({ generos });
  } catch (error) {
    console.error(
      'Error al obtener géneros disponibles:',
      error
    );

    return res.status(500).json({
      message: 'No fue posible obtener los géneros disponibles'
    });
  }
}


async function obtenerArtistasPorGenero(req, res) {
  try {
    const { genero } = req.query;

    if (
      typeof genero !== 'string' ||
      !GENEROS_MUSICALES.includes(genero)
    ) {
      return res.status(400).json({
        message: 'Debes indicar un género musical válido'
      });
    }

    const canciones = getCancionesCollection();
    const perfilesArtista = getPerfilesArtistaCollection();

    // Buscar canciones publicadas de este género,
    // tanto principal como secundario.
    const usuarioIds = await canciones.distinct(
      'usuarioId',
      {
        $or: [
          { generoPrincipal: genero },
          { generosSecundarios: genero }
        ]
      }
    );

    if (usuarioIds.length === 0) {
      return res.status(200).json({
        usuarioIds: []
      });
    }

    // Incluir únicamente artistas con perfiles completos.
    const perfiles = await perfilesArtista
      .find(
        {
          usuarioId: { $in: usuarioIds },
          perfilCompleto: true
        },
        {
          projection: { usuarioId: 1 }
        }
      )
      .toArray();

    const idsValidos = perfiles.map(
      (perfil) => perfil.usuarioId.toString()
    );

    return res.status(200).json({
      usuarioIds: idsValidos
    });
  } catch (error) {
    console.error(
      'Error al obtener artistas por género:',
      error
    );

    return res.status(500).json({
      message: 'No fue posible obtener los artistas del género'
    });
  }
}



// Editar solo metadatos permitidos; audio y género principal permanecen intactos.
async function editarCancion(req, res) {
  try {
    if (req.usuario.rol !== 'artista') return res.status(403).json({ message: 'Solo artistas' });
    const { cancionId } = req.params;
    if (!ObjectId.isValid(cancionId)) return res.status(400).json({ message: 'ID de canción inválido' });
    const permitidos = ['titulo', 'album', 'generosSecundarios'];
    const campos = Object.keys(req.body || {});
    if (!campos.length || campos.some(campo => !permitidos.includes(campo))) {
      return res.status(400).json({ message: 'Solo puedes editar título, álbum y géneros secundarios' });
    }
    const canciones = getCancionesCollection();
    const filtro = { _id: new ObjectId(cancionId), usuarioId: new ObjectId(req.usuario.id) };
    const actual = await canciones.findOne(filtro);
    if (!actual) return res.status(404).json({ message: 'Canción no encontrada' });
    const cambios = {};
    if (Object.hasOwn(req.body, 'titulo')) {
      if (typeof req.body.titulo !== 'string' || !req.body.titulo.trim()) return res.status(400).json({ message: 'El título es obligatorio' });
      cambios.titulo = req.body.titulo.trim();
    }
    if (Object.hasOwn(req.body, 'album')) {
      if (typeof req.body.album !== 'string') return res.status(400).json({ message: 'Álbum inválido' });
      cambios.album = req.body.album.trim();
    }
    if (Object.hasOwn(req.body, 'generosSecundarios')) {
      const recibidos = req.body.generosSecundarios;
      if (!Array.isArray(recibidos) || recibidos.some(g => typeof g !== 'string')) return res.status(400).json({ message: 'Géneros secundarios inválidos' });
      const generos = [...new Set(recibidos.map(g => g.trim()))];
      if (generos.length > 3 || generos.some(g => !GENEROS_MUSICALES.includes(g) || g === actual.generoPrincipal)) {
        return res.status(400).json({ message: 'Selecciona hasta tres géneros secundarios válidos, distintos del principal' });
      }
      cambios.generosSecundarios = generos;
    }
    cambios.fechaActualizacion = new Date();
    await canciones.updateOne(filtro, { $set: cambios });
    return res.json({ message: 'Canción actualizada correctamente' });
  } catch (error) {
    console.error('Error al editar canción:', error);
    return res.status(500).json({ message: 'No fue posible editar la canción' });
  }
}

async function eliminarCancion(req, res) {
  try {
    if (req.usuario.rol !== 'artista') return res.status(403).json({ message: 'Solo artistas' });
    const { cancionId } = req.params;
    if (!ObjectId.isValid(cancionId)) return res.status(400).json({ message: 'ID de canción inválido' });
    const id = new ObjectId(cancionId);
    const usuarioId = new ObjectId(req.usuario.id);
    const canciones = getCancionesCollection();
    const cancion = await canciones.findOne({ _id: id, usuarioId });
    if (!cancion) return res.status(404).json({ message: 'Canción no encontrada' });
    // Eliminar primero el registro evita que el catálogo exponga una canción borrada.
    await canciones.deleteOne({ _id: id, usuarioId });
    await Promise.allSettled([
      getReproduccionesCollection().deleteMany({ cancionId: id }),
      getMeGustasCollection().deleteMany({ cancionId: id }),
      getGuardadasCollection().deleteMany({ cancionId: id }),
      getPerfilesArtistaCollection().updateOne({ usuarioId }, { $pull: { cancionesDestacadas: { $in: [cancionId, id] } } })
    ]);
    const db = getDatabase();
    for (const [bucketName, archivoId] of [['audiosCanciones', cancion.audioId], ['portadasCanciones', cancion.portadaId]]) {
      if (archivoId && ObjectId.isValid(archivoId)) {
        try { await new GridFSBucket(db, { bucketName }).delete(new ObjectId(archivoId)); }
        catch (errorArchivo) { console.error('Archivo huérfano al eliminar canción:', errorArchivo); }
      }
    }
    return res.json({ message: 'Canción eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar canción:', error);
    return res.status(500).json({ message: 'No fue posible eliminar la canción' });
  }
}

module.exports = {
  publicarCancion,
  editarCancion,
  eliminarCancion,
  subirPortadaCancion,
  obtenerMisCanciones,
  obtenerCancionesArtista,
  obtenerCancionPublica,
  obtenerPortadaCancion,
  obtenerAudioCancion,
  obtenerGenerosDisponibles,
  obtenerArtistasPorGenero
};