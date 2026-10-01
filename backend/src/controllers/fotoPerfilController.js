const {
  GridFSBucket,
  ObjectId
} = require('mongodb');

const {
  getDatabase
} = require('../config/database');

const {
  getUsuariosCollection
} = require('../models/usuarioModel');

async function subirFotoPerfil(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Debes seleccionar una imagen'
      });
    }

    const usuarios = getUsuariosCollection();

    const usuario = await usuarios.findOne({
      _id: new ObjectId(req.usuario.id)
    });

    if (!usuario) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    const database = getDatabase();

    const bucket = new GridFSBucket(database, {
      bucketName: 'fotosPerfil'
    });

    const extensionPorMime = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };

    const extension =
      extensionPorMime[req.file.mimetype] || 'jpg';

    const nombreArchivo =
      `perfil-${req.usuario.id}-${Date.now()}.${extension}`;

    const uploadStream = bucket.openUploadStream(
      nombreArchivo,
      {
        metadata: {
          usuarioId: new ObjectId(req.usuario.id),
          contentType: req.file.mimetype
        }
      }
    );

    uploadStream.end(req.file.buffer);

    uploadStream.on('error', (error) => {
      console.error(
        'Error al guardar foto en GridFS:',
        error
      );

      if (!res.headersSent) {
        return res.status(500).json({
          message: 'No fue posible guardar la foto de perfil'
        });
      }
    });

    uploadStream.on('finish', async () => {
      try {
        const nuevaFotoId = uploadStream.id;

        const fotoAnteriorId = usuario.fotoPerfil;

        await usuarios.updateOne(
          {
            _id: new ObjectId(req.usuario.id)
          },
          {
            $set: {
              fotoPerfil: nuevaFotoId.toString(),
              fechaActualizacion: new Date()
            }
          }
        );

        if (
          fotoAnteriorId &&
          ObjectId.isValid(fotoAnteriorId)
        ) {
          try {
            await bucket.delete(
              new ObjectId(fotoAnteriorId)
            );
          } catch (error) {
            console.error(
              'No fue posible eliminar la foto anterior:',
              error
            );
          }
        }

        return res.status(200).json({
          message: 'Foto de perfil actualizada correctamente',
          fotoPerfil: nuevaFotoId.toString()
        });
      } catch (error) {
        console.error(
          'Error al actualizar foto del usuario:',
          error
        );

        if (!res.headersSent) {
          return res.status(500).json({
            message: 'No fue posible actualizar la foto de perfil'
          });
        }
      }
    });
  } catch (error) {
    console.error(
      'Error al subir foto de perfil:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
}
async function obtenerFotoPerfil(req, res) {
  try {
    const { fotoId } = req.params;

    if (!ObjectId.isValid(fotoId)) {
      return res.status(400).json({
        message: 'El identificador de la foto no es válido'
      });
    }

    const database = getDatabase();

    const bucket = new GridFSBucket(database, {
      bucketName: 'fotosPerfil'
    });

    const archivo = await database
      .collection('fotosPerfil.files')
      .findOne({
        _id: new ObjectId(fotoId)
      });

    if (!archivo) {
      return res.status(404).json({
        message: 'Foto de perfil no encontrada'
      });
    }

    const contentType =
      archivo.metadata?.contentType || 'image/jpeg';

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');

    const downloadStream = bucket.openDownloadStream(
      new ObjectId(fotoId)
    );

    downloadStream.on('error', (error) => {
      console.error(
        'Error al obtener foto desde GridFS:',
        error
      );

      if (!res.headersSent) {
        return res.status(500).json({
          message: 'No fue posible obtener la foto de perfil'
        });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error(
      'Error al obtener foto de perfil:',
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = {
  subirFotoPerfil,
  obtenerFotoPerfil
};