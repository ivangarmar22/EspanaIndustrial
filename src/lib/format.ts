/**
 * Spanish number formatting for counts and measures: the thousands separator is
 * always shown ("1.267", not "1267"), as the site's editorial style asks, and the
 * decimal separator is a comma. Years and codes are never passed through here.
 */
const integer = new Intl.NumberFormat("es-ES", { useGrouping: "always", maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("es-ES", {
  useGrouping: "always",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const formatNumber = (n: number) => integer.format(n);

/** Kilometres with one decimal, e.g. "1.204,5 km". */
export const formatKm = (km: number) => `${oneDecimal.format(km)} km`;
