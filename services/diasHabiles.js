// Días calendario = simplemente cuenta todos los días entre inicio y fin inclusive
function calcularDiasHabiles(fechaInicio, fechaFin) {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diff = Math.round((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
  return Promise.resolve(diff > 0 ? diff : 0);
}

module.exports = { calcularDiasHabiles };
