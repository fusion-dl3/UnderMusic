const { ObjectId } = require('mongodb');

const {
  getPerfilesArtistaCollection
} = require('../models/perfilArtistaModel');

const {
  getUsuariosCollection
} = require('../models/usuarioModel');

const {
  GENEROS_MUSICALES
} = require('../constants/generos');
function validarContacto(campo, valor) {
  const texto = valor.trim();
  if (!texto) return '';
  if (campo === 'correoContacto') {
    return /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(texto) && texto.length <= 254
      ? '' : 'Ingresa un correo electrónico con formato válido.';
  }
  if (texto.length > 500 || !/^https:\/\//i.test(texto)) {
    return 'Pega la URL completa que comienza con https://';
  }
  try {
    const url = new URL(texto);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) {
      return 'Ingresa un enlace HTTPS válido del perfil.';
    }
    const dominio = url.hostname.toLowerCase();
    const segmentos = url.pathname.split('/').filter(Boolean);
    const usuarioValido = (nombre) => /^[a-zA-Z0-9._-]{1,100}$/.test(nombre);
    if (campo === 'instagram') {
      if (!['instagram.com', 'www.instagram.com'].includes(dominio) ||
          segmentos.length !== 1 || !/^[a-zA-Z0-9._]{1,30}$/.test(segmentos[0]) ||
          ['p', 'reel', 'reels', 'stories', 'explore', 'direct', 'accounts'].includes(segmentos[0].toLowerCase())) {
        return 'Pega una URL de perfil de Instagram, por ejemplo https://www.instagram.com/usuario/';
      }
    } else if (campo === 'facebook') {
      if (!['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com', 'www.fb.com'].includes(dominio) ||
          !((segmentos.length === 1 && segmentos[0].toLowerCase() === 'profile.php' && /^\d+$/.test(url.searchParams.get('id') || '')) ||
            (segmentos.length === 1 && usuarioValido(segmentos[0]) && !['watch', 'reel', 'reels', 'share', 'groups', 'events', 'marketplace'].includes(segmentos[0].toLowerCase())))) {
        return 'Pega una URL de perfil o página de Facebook.';
      }
    } else if (campo === 'twitter') {
      if (!['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(dominio) ||
          segmentos.length !== 1 || !/^[a-zA-Z0-9_]{1,15}$/.test(segmentos[0]) ||
          ['home', 'explore', 'search', 'settings', 'messages', 'notifications', 'compose'].includes(segmentos[0].toLowerCase())) {
        return 'Pega una URL de perfil de X (Twitter), por ejemplo https://x.com/usuario';
      }
    }
    return '';
  } catch {
    return 'La URL ingresada no es válida.';
  }
}

async function obtenerMiPerfilArtista(req, res) {
  try {
    if (req.usuario.rol !== 'artista') {
      return res.status(403).json({
        message: 'Esta función está disponible solo para artistas'
      });
    }

    const perfilesArtista = getPerfilesArtistaCollection();

    const perfilArtista = await perfilesArtista.findOne({
      usuarioId: new ObjectId(req.usuario.id)
    });

    if (!perfilArtista) {
      return res.status(200).json({
        perfilArtista: null,
        perfilCompleto: false
      });
    }

    return res.status(200).json({
      perfilArtista: {
        id: perfilArtista._id,
        usuarioId: perfilArtista.usuarioId,
        nombreArtistico: perfilArtista.nombreArtistico,
        biografia: perfilArtista.biografia,
        generoPrincipal: perfilArtista.generoPrincipal,
        generosAdicionales:
          perfilArtista.generosAdicionales || [],
        correoContacto: perfilArtista.correoContacto || '',
        instagram: perfilArtista.instagram || '',
        facebook: perfilArtista.facebook || '',
        twitter: perfilArtista.twitter || '',
        perfilCompleto: perfilArtista.perfilCompleto === true
      }
    });
  } catch (error) {
    console.error(
      'Error al obtener perfil de artista:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
}
async function actualizarMiPerfilArtista(req, res) {
  try {
    if (req.usuario.rol !== 'artista') {
      return res.status(403).json({
        message: 'Esta función está disponible solo para artistas'
      });
    }

    const {
      nombreArtistico = '',
      biografia = '',
      generoPrincipal = '',
      generosAdicionales = [],
      correoContacto = '',
      instagram = '',
      facebook = '',
      twitter = ''
    } = req.body;

    if (
      typeof nombreArtistico !== 'string' ||
      typeof biografia !== 'string' ||
      typeof generoPrincipal !== 'string' ||
      typeof correoContacto !== 'string' ||
      typeof instagram !== 'string' ||
      typeof facebook !== 'string' ||
      typeof twitter !== 'string'
    ) {
      return res.status(400).json({
        message: 'Los datos del perfil artístico no son válidos'
      });
    }

    if (!Array.isArray(generosAdicionales)) {
      return res.status(400).json({
        message: 'Los géneros adicionales deben enviarse como una lista'
      });
    }

    const nombreArtisticoNormalizado = nombreArtistico.trim();
    const biografiaNormalizada = biografia.trim();
    const generoPrincipalNormalizado = generoPrincipal.trim();
    if (biografiaNormalizada.length > 500) {
  return res.status(400).json({
    message: 'La biografía no puede superar los 500 caracteres'
  });
}

    const generosAdicionalesNormalizados = [
      ...new Set(
        generosAdicionales
          .filter((genero) => typeof genero === 'string')
          .map((genero) => genero.trim())
          .filter((genero) => genero.length > 0)
      )
    ];

    if (
      generoPrincipalNormalizado &&
      !GENEROS_MUSICALES.includes(generoPrincipalNormalizado)
    ) {
      return res.status(400).json({
        message: 'El género principal no es válido'
      });
    }

    const generosInvalidos = generosAdicionalesNormalizados.filter(
      (genero) => !GENEROS_MUSICALES.includes(genero)
    );

    if (generosInvalidos.length > 0) {
      return res.status(400).json({
        message: 'Uno o más géneros adicionales no son válidos'
      });
    }

    if (generosAdicionalesNormalizados.length > 3) {
      return res.status(400).json({
        message: 'Puedes seleccionar como máximo 3 géneros adicionales'
      });
    }

    if (
      generoPrincipalNormalizado &&
      generosAdicionalesNormalizados.includes(
        generoPrincipalNormalizado
      )
    ) {
      return res.status(400).json({
        message:
          'El género principal no puede repetirse como género adicional'
      });
    }

    const contactos = { correoContacto, instagram, facebook, twitter };
    for (const [campo, valor] of Object.entries(contactos)) {
      const errorContacto = validarContacto(campo, valor);
      if (errorContacto) {
        return res.status(400).json({ message: errorContacto, campo });
      }
    }

    const perfilCompleto = Boolean(
      nombreArtisticoNormalizado &&
      biografiaNormalizada &&
      generoPrincipalNormalizado
    );

    const fechaActual = new Date();

    const perfilesArtista = getPerfilesArtistaCollection();

    const perfilArtista = await perfilesArtista.findOneAndUpdate(
      {
        usuarioId: new ObjectId(req.usuario.id)
      },
      {
        $set: {
          nombreArtistico: nombreArtisticoNormalizado,
          biografia: biografiaNormalizada,
          generoPrincipal: generoPrincipalNormalizado,
          generosAdicionales: generosAdicionalesNormalizados,
          correoContacto: correoContacto.trim(),
          instagram: instagram.trim(),
          facebook: facebook.trim(),
          twitter: twitter.trim(),
          perfilCompleto,
          fechaActualizacion: fechaActual
        },
        $setOnInsert: {
          usuarioId: new ObjectId(req.usuario.id),
          fechaCreacion: fechaActual
        }
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    );

    return res.status(200).json({
      message: perfilCompleto
        ? 'Perfil artístico actualizado correctamente'
        : 'Perfil artístico guardado como incompleto',
      perfilArtista: {
        id: perfilArtista._id,
        usuarioId: perfilArtista.usuarioId,
        nombreArtistico: perfilArtista.nombreArtistico,
        biografia: perfilArtista.biografia,
        generoPrincipal: perfilArtista.generoPrincipal,
        generosAdicionales: perfilArtista.generosAdicionales || [],
        correoContacto: perfilArtista.correoContacto || '',
        instagram: perfilArtista.instagram || '',
        facebook: perfilArtista.facebook || '',
        twitter: perfilArtista.twitter || '',
        perfilCompleto: perfilArtista.perfilCompleto === true
      }
    });
  } catch (error) {
    console.error(
      'Error al actualizar perfil de artista:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
}

async function obtenerPerfilArtistaPublico(req, res) {
  try {
    const { usuarioId } = req.params;

    if (!ObjectId.isValid(usuarioId)) {
      return res.status(400).json({
        message:
          'El identificador del artista no es válido'
      });
    }

    const usuarios =
      getUsuariosCollection();

    const perfilesArtista =
      getPerfilesArtistaCollection();

    const usuario = await usuarios.findOne({
      _id: new ObjectId(usuarioId),
      rol: 'artista'
    });

    if (!usuario) {
      return res.status(404).json({
        message:
          'No se encontró el artista'
      });
    }

    const perfilArtista =
      await perfilesArtista.findOne({
        usuarioId: usuario._id,
        perfilCompleto: true
      });

    if (!perfilArtista) {
      return res.status(404).json({
        message:
          'El perfil artístico no está disponible'
      });
    }

    return res.status(200).json({
      artista: {
        usuarioId: usuario._id,

        nombreUsuario:
          usuario.nombreUsuario,

        fotoPerfil:
          usuario.fotoPerfil || null,

        ubicacion: {
          pais:
            usuario.ubicacion?.pais || '',
          region:
            usuario.ubicacion?.region || '',
          comuna:
            usuario.ubicacion?.comuna || ''
        },

        nombreArtistico:
          perfilArtista.nombreArtistico,

        biografia:
          perfilArtista.biografia,

        generoPrincipal:
          perfilArtista.generoPrincipal,

        generosAdicionales:
          perfilArtista.generosAdicionales || [],

        correoContacto:
          perfilArtista.correoContacto || '',

        instagram:
          perfilArtista.instagram || '',

        facebook:
          perfilArtista.facebook || '',

        twitter:
          perfilArtista.twitter || ''
      }
    });
  } catch (error) {
    console.error(
      'Error al obtener perfil público de artista:',
      error
    );

    return res.status(500).json({
      message:
        'Error interno del servidor'
    });
  }
}

async function buscarArtistas(req, res) {
  try {
    const {
      nombre = '',
      pais = '',
      region = '',
      comuna = '',
      genero = ''
    } = req.query;

    const filtros = { nombre, pais, region, comuna, genero };

    if (
      Object.values(filtros).some(
        (valor) => typeof valor !== 'string'
      )
    ) {
      return res.status(400).json({
        message: 'Los filtros de búsqueda no son válidos'
      });
    }

    const usuarios = getUsuariosCollection();
    const perfilesArtista = getPerfilesArtistaCollection();

    const filtroUsuarios = {
      rol: 'artista'
    };

    if (pais && pais !== 'Todos') {
      filtroUsuarios['ubicacion.pais'] = pais;
    }

    if (region && region !== 'Todas') {
      filtroUsuarios['ubicacion.region'] = region;
    }

    if (comuna && comuna !== 'Todas') {
      filtroUsuarios['ubicacion.comuna'] = comuna;
    }

    const usuariosEncontrados = await usuarios
      .find(filtroUsuarios)
      .project({
        nombreUsuario: 1,
        fotoPerfil: 1,
        ubicacion: 1
      })
      .toArray();

    const usuariosPorId = new Map(
      usuariosEncontrados.map((usuario) => [
        usuario._id.toString(),
        usuario
      ])
    );

    const filtroPerfiles = {
      perfilCompleto: true,
      usuarioId: {
        $in: usuariosEncontrados.map((usuario) => usuario._id)
      }
    };

    if (genero && genero !== 'Todos') {
      filtroPerfiles.$or = [
        { generoPrincipal: genero },
        { generosAdicionales: genero }
      ];
    }

    if (nombre.trim()) {
      const nombreEscapado = nombre
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      filtroPerfiles.nombreArtistico = {
        $regex: nombreEscapado,
        $options: 'i'
      };
    }

    const perfilesEncontrados = await perfilesArtista
      .find(filtroPerfiles)
      .sort({ fechaCreacion: -1 })
      .limit(100)
      .toArray();

    const artistas = perfilesEncontrados.map((perfil) => {
      const usuario = usuariosPorId.get(
        perfil.usuarioId.toString()
      );

      return {
        usuarioId: perfil.usuarioId,
        nombreUsuario: usuario.nombreUsuario,
        nombreArtistico: perfil.nombreArtistico,
        fotoPerfil: usuario.fotoPerfil || null,
        ubicacion: {
          pais: usuario.ubicacion?.pais || '',
          region: usuario.ubicacion?.region || '',
          comuna: usuario.ubicacion?.comuna || ''
        },
        generoPrincipal: perfil.generoPrincipal,
        generosAdicionales: perfil.generosAdicionales || []
      };
    });

    return res.status(200).json({
      artistas,
      total: artistas.length
    });
  } catch (error) {
    console.error('Error al buscar artistas:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
}

module.exports = {
  obtenerMiPerfilArtista,
  actualizarMiPerfilArtista,
  obtenerPerfilArtistaPublico,
  buscarArtistas
};