function normalizarNombreUsuario(nombreUsuario) {
  return nombreUsuario
    .trim()
    .toLowerCase()
    .replace(/\u00f1/g, '__ENIE__')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/__ENIE__/g, '\u00f1');
}

function normalizarCorreo(correo) {
  return correo.trim().toLowerCase();
}

function esNombreUsuarioValido(nombreUsuario) {
  const patron = /^[a-z0-9\u00f1._-]{1,30}$/;

  return patron.test(nombreUsuario);
}

function esCorreoValido(correo) {
  const patron = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return patron.test(correo);
}

module.exports = {
  normalizarNombreUsuario,
  normalizarCorreo,
  esNombreUsuarioValido,
  esCorreoValido
};