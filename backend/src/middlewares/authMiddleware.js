const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        message: 'Token de autenticacion requerido'
      });
    }

    const partes = authorization.split(' ');

    if (
      partes.length !== 2 ||
      partes[0] !== 'Bearer' ||
      !partes[1]
    ) {
      return res.status(401).json({
        message: 'Formato de token invalido'
      });
    }

    const token = partes[1];

    const datosToken = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.usuario = {
      id: datosToken.id,
      rol: datosToken.rol
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Token invalido o expirado'
    });
  }
}

module.exports = {
  verificarToken
};