
 // Avisos para sincronizar la Biblioteca sin cambiar de pestaña.
 // Se emiten después de que el backend confirma la operación.

export type InteraccionBiblioteca = 'me-gustas' | 'guardadas';

type Escucha = (
  tipo: InteraccionBiblioteca,
  cancionId: string
) => void;

const escuchas = new Set<Escucha>();

export function avisarCambioBiblioteca(
  tipo: InteraccionBiblioteca,
  cancionId: string
) {
  escuchas.forEach(escucha => escucha(tipo, cancionId));
}

export function escucharCambiosBiblioteca(
  escucha: Escucha
): () => void {
  escuchas.add(escucha);

  return () => {
    escuchas.delete(escucha);
  };
}
