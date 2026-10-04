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
            cancion.fechaActualizacion
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
            cancion.fechaActualizacion
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

module.exports = {
  publicarCancion,
  subirPortadaCancion,
  obtenerMisCanciones,
  obtenerCancionesArtista,
  obtenerPortadaCancion,
  obtenerAudioCancion
};