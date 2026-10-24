
const { ObjectId } = require('mongodb');

const {
  getReproduccionesCollection,
} = require('../models/reproduccionModel');

const {
  getSeguimientosCollection,
} = require('../models/seguimientoModel');

const {
  getUsuariosCollection,
} = require('../models/usuarioModel');

const {
  getPerfilesArtistaCollection,
} = require('../models/perfilArtistaModel');

// Obtener las estadísticas generales de un artista.
async function obtenerEstadisticasArtista(req, res) {
  try {
    const { usuarioId } = req.params;

    // Validar el identificador recibido.
    if (
      typeof usuarioId !== 'string' ||
      !ObjectId.isValid(usuarioId)
    ) {
      return res.status(400).json({
        message: 'El identificador del artista no es válido',
      });
    }

    const artistaId = new ObjectId(usuarioId);

    // Comprobar que el usuario existe y es artista.
    const artista = await getUsuariosCollection().findOne({
      _id: artistaId,
      rol: 'artista',
    });

    if (!artista) {
      return res.status(404).json({
        message: 'No se encontró el artista',
      });
    }

    // Comprobar que su perfil artístico está disponible.
    const perfilArtista =
      await getPerfilesArtistaCollection().findOne({
        usuarioId: artistaId,
        perfilCompleto: true,
      });

    if (!perfilArtista) {
      return res.status(404).json({
        message: 'El perfil artístico no está disponible',
      });
    }

    const reproducciones = getReproduccionesCollection();
    const seguimientos = getSeguimientosCollection();

    // Consultar las tres estadísticas utilizando datos reales.
    const [
      reproduccionesTotales,
      usuariosOyentes,
      cantidadSeguidores,
    ] = await Promise.all([
      reproducciones.countDocuments({
        artistaId,
      }),

      reproducciones.distinct('usuarioId', {
        artistaId,
      }),

      seguimientos.countDocuments({
        artistaId,
      }),
    ]);

    return res.status(200).json({
      oyentesUnicos: usuariosOyentes.length,
      reproduccionesTotales,
      cantidadSeguidores,
    });
  } catch (error) {
    console.error(
      'Error al obtener estadísticas del artista:',
      error
    );

    return res.status(500).json({
      message: 'No fue posible obtener las estadísticas del artista',
    });
  }
}

module.exports = {
  obtenerEstadisticasArtista,
};
