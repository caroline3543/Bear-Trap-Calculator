/* ============================================================
   LANGUAGE DETECTION — first visit only (a saved choice always wins).
   1. The phone's own language list (navigator.languages) — the best sign
      of what someone reads, e.g. an English speaker living in Italy.
   2. If none of those is available in the app: the country implied by the
      phone's time zone (no location permission, nothing sent anywhere).
   3. Otherwise English.
   ============================================================ */

/** Time zone → the app language most people there speak (only zones we have a language for). */
const ZONE_LANG = {
  it: ["Europe/Rome", "Europe/San_Marino", "Europe/Vatican"],
  es: ["Europe/Madrid", "Atlantic/Canary", "Africa/Ceuta", "America/Mexico_City", "America/Monterrey", "America/Merida", "America/Cancun",
    "America/Chihuahua", "America/Tijuana", "America/Hermosillo", "America/Mazatlan", "America/Bogota", "America/Lima", "America/Santiago",
    "America/Argentina/Buenos_Aires", "America/Buenos_Aires", "America/Argentina/Cordoba", "America/Caracas", "America/Guayaquil", "America/La_Paz",
    "America/Asuncion", "America/Montevideo", "America/Guatemala", "America/El_Salvador", "America/Tegucigalpa", "America/Managua",
    "America/Costa_Rica", "America/Panama", "America/Havana", "America/Santo_Domingo", "America/Puerto_Rico", "Pacific/Galapagos"],
  ko: ["Asia/Seoul"],
  de: ["Europe/Berlin", "Europe/Busingen", "Europe/Vienna", "Europe/Zurich", "Europe/Vaduz", "Europe/Luxembourg"],
  ru: ["Europe/Moscow", "Europe/Kaliningrad", "Europe/Samara", "Europe/Volgograd", "Europe/Saratov", "Europe/Ulyanovsk", "Europe/Astrakhan",
    "Europe/Kirov", "Asia/Yekaterinburg", "Asia/Omsk", "Asia/Novosibirsk", "Asia/Barnaul", "Asia/Tomsk", "Asia/Novokuznetsk",
    "Asia/Krasnoyarsk", "Asia/Irkutsk", "Asia/Chita", "Asia/Yakutsk", "Asia/Khandyga", "Asia/Vladivostok", "Asia/Ust-Nera",
    "Asia/Magadan", "Asia/Sakhalin", "Asia/Srednekolymsk", "Asia/Kamchatka", "Asia/Anadyr", "Europe/Minsk"],
  pl: ["Europe/Warsaw"],
  tr: ["Europe/Istanbul", "Asia/Istanbul"],
  ar: ["Asia/Riyadh", "Asia/Dubai", "Asia/Kuwait", "Asia/Qatar", "Asia/Bahrain", "Asia/Muscat", "Asia/Aden", "Asia/Baghdad",
    "Asia/Amman", "Asia/Beirut", "Asia/Damascus", "Asia/Gaza", "Asia/Hebron", "Africa/Cairo", "Africa/Tripoli", "Africa/Tunis",
    "Africa/Algiers", "Africa/Casablanca", "Africa/El_Aaiun", "Africa/Khartoum", "Africa/Nouakchott"],
};
const ZONE_TO_LANG = Object.fromEntries(Object.entries(ZONE_LANG).flatMap(([lang, zones]) => zones.map((z) => [z, lang])));

/** Best language for this device among `supported` codes. Arguments are for testing. */
export function detectLanguage(supported, languages, timeZone) {
  const list = languages ?? (typeof navigator !== "undefined" ? navigator.languages || [navigator.language] : []);
  for (const tag of list) {
    const base = String(tag || "").toLowerCase().split(/[-_]/)[0];
    if (supported.includes(base)) return base;
  }
  let tz = timeZone;
  if (tz === undefined) {
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { tz = null; }
  }
  const byZone = ZONE_TO_LANG[tz];
  if (byZone && supported.includes(byZone)) return byZone;
  return supported.includes("en") ? "en" : supported[0];
}
