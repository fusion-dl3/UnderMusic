
const { ObjectId } = require('mongodb');

const {
  getUsuariosCollection,
} = require('../models/usuarioModel');

const {
  getPerfilesArtistaCollection,
} = require('../models/perfilArtistaModel');

// Devuelve hasta tres artistas cercanos según la ubicación registrada.
async function obtenerArtistasCercanos(req, res) {
  try {
    const usuarioId = req.usuario?.id;

    if (!usuarioId || !ObjectId.isValid(usuarioId)) {
      return res.status(401).json({
        message: 'Debes iniciar sesión para descubrir artistas cercanos',
      });
    }

    const usuarios = getUsuariosCollection();

    const usuario = await usuarios.findOne({
      _id: new ObjectId(usuarioId),
    });

    if (!usuario) {
      return res.status(404).json({
        message: 'No se encontró el usuario',
      });
    }

    const ubicacion = usuario.ubicacion || {};
    const pais = ubicacion.pais;
    const region = ubicacion.region;
    const comuna = ubicacion.comuna;

    if (!pais || !region || !comuna) {
      return res.status(200).json({
        artistas: [],
        criterio: 'sin_ubicacion',
      });
    }

    // Buscar artistas del mismo país, excluyendo la propia cuenta.
    const usuariosArtistas = await usuarios.find(
      {
        rol: 'artista',
        _id: { $ne: new ObjectId(usuarioId) },
        'ubicacion.pais': pais,
      },
      {
        projection: {
          nombreUsuario: 1,
          fotoPerfil: 1,
          ubicacion: 1,
        },
      }
    ).toArray();

    if (usuariosArtistas.length === 0) {
      return res.status(200).json({
        artistas: [],
        criterio: 'ubicacion',
      });
    }

    const idsArtistas = usuariosArtistas.map(
      (artista) => artista._id
    );

    // Solo perfiles artísticos completos.
    const perfiles = await getPerfilesArtistaCollection()
      .find({
        usuarioId: { $in: idsArtistas },
        perfilCompleto: true,
      })
      .toArray();

    const perfilesPorId = new Map(
      perfiles.map((perfil) => [
        perfil.usuarioId.toString(),
        perfil,
      ])
    );

    const candidatos = usuariosArtistas
      .filter((artista) =>
        perfilesPorId.has(artista._id.toString())
      )
      .map((artista) => {
        const perfil = perfilesPorId.get(
          artista._id.toString()
        );

        const mismaRegion =
          artista.ubicacion?.region === region;

        const mismaComuna =
          mismaRegion &&
          artista.ubicacion?.comuna === comuna;

        let prioridad = 2;

        if (mismaRegion) {
          prioridad = 1;
        }

        if (usuario.priorizarComuna === true && mismaComuna) {
          prioridad = 0;
        }

        return {
          usuarioId: artista._id.toString(),
          nombreUsuario: artista.nombreUsuario,
          nombreArtistico: perfil.nombreArtistico,
          fotoPerfil: artista.fotoPerfil || null,
          generoPrincipal: perfil.generoPrincipal,
          generosAdicionales: perfil.generosAdicionales || [],
          ubicacion: artista.ubicacion || null,
          prioridad,
        };
      });

    // Priorizar cercanía geográfica.
    // En igualdad de prioridad, mantener un orden estable.
    candidatos.sort((a, b) => {
      if (a.prioridad !== b.prioridad) {
        return a.prioridad - b.prioridad;
      }

      return a.usuarioId.localeCompare(b.usuarioId);
    });

    const artistas = candidatos
      .slice(0, 3)
      .map(({ prioridad, ...artista }) => artista);

    return res.status(200).json({
      artistas,
      criterio: usuario.priorizarComuna === true
        ? 'comuna_region_pais'
        : 'region_pais',
    });

  } catch (error) {
    console.error(
      'Error al obtener artistas cercanos:',
      error
    );

    return res.status(500).json({
      message: 'No fue posible obtener artistas cercanos',
    });
  }
}

module.exports = {
  obtenerArtistasCercanos,
};
