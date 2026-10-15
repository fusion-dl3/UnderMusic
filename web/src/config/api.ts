const API_URL = (
  import.meta.env.VITE_API_URL || ''
).replace(/\/+$/, '');

export const apiUrl = (ruta: string): string => {
  const rutaNormalizada = ruta.startsWith('/')
    ? ruta
    : `/${ruta}`;

  return `${API_URL}${rutaNormalizada}`;
};