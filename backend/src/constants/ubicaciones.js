const PAISES = ['Chile'];

const REGIONES_POR_PAIS = {
  Chile: ['Región Metropolitana']
};

const COMUNAS_POR_REGION = {
  'Región Metropolitana': [
    'Alhué',
    'Buin',
    'Calera de Tango',
    'Cerrillos',
    'Cerro Navia',
    'Colina',
    'Conchalí',
    'Curacaví',
    'El Bosque',
    'El Monte',
    'Estación Central',
    'Huechuraba',
    'Independencia',
    'Isla de Maipo',
    'La Cisterna',
    'La Florida',
    'La Granja',
    'La Pintana',
    'La Reina',
    'Lampa',
    'Las Condes',
    'Lo Barnechea',
    'Lo Espejo',
    'Lo Prado',
    'Macul',
    'Maipú',
    'María Pinto',
    'Melipilla',
    'Ñuñoa',
    'Padre Hurtado',
    'Paine',
    'Pedro Aguirre Cerda',
    'Peñaflor',
    'Peñalolén',
    'Pirque',
    'Providencia',
    'Pudahuel',
    'Puente Alto',
    'Quilicura',
    'Quinta Normal',
    'Recoleta',
    'Renca',
    'San Bernardo',
    'San Joaquín',
    'San José de Maipo',
    'San Miguel',
    'San Pedro',
    'San Ramón',
    'Santiago',
    'Talagante',
    'Tiltil',
    'Vitacura'
  ]
};

function esUbicacionValida(pais, region, comuna) {
  if (!PAISES.includes(pais)) {
    return false;
  }

  const regionesValidas = REGIONES_POR_PAIS[pais];

  if (
    !regionesValidas ||
    !regionesValidas.includes(region)
  ) {
    return false;
  }

  const comunasValidas = COMUNAS_POR_REGION[region];

  if (
    !comunasValidas ||
    !comunasValidas.includes(comuna)
  ) {
    return false;
  }

  return true;
}

module.exports = {
  PAISES,
  REGIONES_POR_PAIS,
  COMUNAS_POR_REGION,
  esUbicacionValida
};