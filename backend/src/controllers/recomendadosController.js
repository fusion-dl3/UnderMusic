
const { ObjectId } = require('mongodb');

const {
  getUsuariosCollection,
} = require('../models/usuarioModel');

const {
  getPerfilesArtistaCollection,
} = require('../models/perfilArtistaModel');

const {
  getReproduccionesCollection,
} = require('../models/reproduccionModel');

const {
  obtenerGenerosEscuchados,
} = require('../services/estadisticasMusicalesService');

// Devuelve hasta cinco artistas recomendados según
// gustos musicales y crecimiento de reproducciones.
async function obtenerArtistasRecomendados(req, res) {
  try {
    const usuarioId = req.usuario?.id;

    if (!usuarioId || !ObjectId.isValid(usuarioId)) {
      return res.status(401).json({
        message: 'Debes iniciar sesión para ver artistas recomendados',
      });
    }

    const usuario = await getUsuariosCollection().findOne({
      _id: new ObjectId(usuarioId),
    });

    if (!usuario) {
      return res.status(404).json({
        message: 'No se encontró el usuario',
      });
    }

    // Preferimos los géneros realmente escuchados.
    const generosEscuchados = await obtenerGenerosEscuchados(
      usuarioId,
      5
    );

    let generosPreferidos = generosEscuchados.map(
      (item) => item.genero
    );

    let criterio = 'historial';

    // Si no existe historial, usamos las preferencias.
    if (generosPreferidos.length === 0) {
      generosPreferidos = Array.isArray(usuario.generosFavoritos)
        ? usuario.generosFavoritos.filter(
            (genero) =>
              typeof genero === 'string' &&
              genero.trim().length > 0
          )
        : [];

      criterio =
        generosPreferidos.length > 0
          ? 'preferencias'
          : 'general';
    }

    const perfiles = await getPerfilesArtistaCollection()
      .find(
        { perfilCompleto: true },
        {
          projection: {
            usuarioId: 1,
            nombreArtistico: 1,
            generoPrincipal: 1,
            generosAdicionales: 1,
          },
        }
      )
      .toArray();

    if (perfiles.length === 0) {
      return res.status(200).json({
        artistas: [],
        criterio,
        generos: generosPreferidos,
      });
    }

    const ids = perfiles
      .filter((perfil) => perfil.usuarioId)
      .map((perfil) => perfil.usuarioId);

    const usuariosArtistas = await getUsuariosCollection()
      .find(
        {
          _id: { $in: ids },
          rol: 'artista',
        },
        {
          projection: {
            nombreUsuario: 1,
            fotoPerfil: 1,
            ubicacion: 1,
          },
        }
      )
      .toArray();

    const usuariosPorId = new Map(
      usuariosArtistas.map((artista) => [
        artista._id.toString(),
        artista,
      ])
    );

    const perfilesValidos = perfiles.filter((perfil) =>
      usuariosPorId.has(perfil.usuarioId.toString())
    );

    const coincideGenero = (perfil) => {
      if (generosPreferidos.length === 0) {
        return true;
      }

      const generosArtista = [
        perfil.generoPrincipal,
        ...(Array.isArray(perfil.generosAdicionales)
          ? perfil.generosAdicionales
          : []),
      ];

      return generosArtista.some((genero) =>
        generosPreferidos.includes(genero)
      );
    };

    // Dos períodos consecutivos de 14 días.
    const ahora = new Date();

    const inicioActual = new Date(
      ahora.getTime() - 14 * 24 * 60 * 60 * 1000
    );

    const inicioAnterior = new Date(
      ahora.getTime() - 28 * 24 * 60 * 60 * 1000
    );

    const idsValidos = perfilesValidos.map(
      (perfil) => perfil.usuarioId
    );

    const estadisticas = idsValidos.length
      ? await getReproduccionesCollection()
          .aggregate([
            {
              $match: {
                artistaId: { $in: idsValidos },
                fechaEscucha: {
                  $gte: inicioAnterior,
                  $lte: ahora,
                },
              },
            },
            {
              $group: {
                _id: '$artistaId',
                reproduccionesActuales: {
                  $sum: {
                    $cond: [
                      { $gte: ['$fechaEscucha', inicioActual] },
                      1,
                      0,
                    ],
                  },
                },
                reproduccionesAnteriores: {
                  $sum: {
                    $cond: [
                      { $lt: ['$fechaEscucha', inicioActual] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ])
          .toArray()
      : [];

    const estadisticasPorId = new Map(
      estadisticas.map((item) => [
        item._id.toString(),
        item,
      ])
    );

    const candidatos = perfilesValidos.map((perfil) => {
      const id = perfil.usuarioId.toString();
      const usuarioArtista = usuariosPorId.get(id);
      const datos = estadisticasPorId.get(id);

      const reproduccionesActuales =
        datos?.reproduccionesActuales || 0;

      const reproduccionesAnteriores =
        datos?.reproduccionesAnteriores || 0;

      const crecimientoAbsoluto =
        reproduccionesActuales - reproduccionesAnteriores;

      const crecimientoPorcentual =
        reproduccionesAnteriores > 0
          ? (crecimientoAbsoluto / reproduccionesAnteriores) * 100
          : null;

      return {
        usuarioId: id,
        nombreUsuario: usuarioArtista.nombreUsuario,
        nombreArtistico: perfil.nombreArtistico,
        fotoPerfil: usuarioArtista.fotoPerfil || null,
        generoPrincipal: perfil.generoPrincipal,
        generosAdicionales:
          perfil.generosAdicionales || [],
        ubicacion: usuarioArtista.ubicacion || null,
        reproduccionesActuales,
        reproduccionesAnteriores,
        crecimientoAbsoluto,
        crecimientoPorcentual,
        actividadNueva:
          reproduccionesAnteriores === 0 &&
          reproduccionesActuales > 0,
        coincideGenero: coincideGenero(perfil),
      };
    });

    // Priorizamos afinidad musical y después crecimiento.
    candidatos.sort((a, b) => {
      if (a.coincideGenero !== b.coincideGenero) {
        return a.coincideGenero ? -1 : 1;
      }

      const aCrece = a.crecimientoAbsoluto > 0;
      const bCrece = b.crecimientoAbsoluto > 0;

      if (aCrece !== bCrece) {
        return aCrece ? -1 : 1;
      }

      if (b.crecimientoAbsoluto !== a.crecimientoAbsoluto) {
        return b.crecimientoAbsoluto - a.crecimientoAbsoluto;
      }

      if (b.reproduccionesActuales !== a.reproduccionesActuales) {
        return b.reproduccionesActuales - a.reproduccionesActuales;
      }

      return a.nombreArtistico.localeCompare(
        b.nombreArtistico,
        'es'
      );
    });

    const artistas = candidatos
      .slice(0, 5)
      .map(({ coincideGenero, ...artista }) => artista);

    return res.status(200).json({
      artistas,
      criterio,
      generos: generosPreferidos,
      periodoDias: 14,
    });
  } catch (error) {
    console.error(
      'Error al obtener artistas recomendados:',
      error
    );

    return res.status(500).json({
      message: 'No fue posible obtener artistas recomendados',
    });
  }
}

module.exports = {
  obtenerArtistasRecomendados,
};
