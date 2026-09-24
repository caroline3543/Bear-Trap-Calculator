/* ============================================================
   CITY → IANA ZONE lookup (bundled, no network). Searching also
   matches raw zone ids, so any zone is reachable even if its city
   isn't listed here. Add rows freely: [city, country, zone].
   ============================================================ */
import { allTimeZones, zoneCity } from "./time.js";

export const CITIES = [
  ["Auckland", "New Zealand", "Pacific/Auckland"], ["Wellington", "New Zealand", "Pacific/Auckland"],
  ["Christchurch", "New Zealand", "Pacific/Auckland"], ["Sydney", "Australia", "Australia/Sydney"],
  ["Melbourne", "Australia", "Australia/Melbourne"], ["Brisbane", "Australia", "Australia/Brisbane"],
  ["Perth", "Australia", "Australia/Perth"], ["Adelaide", "Australia", "Australia/Adelaide"],
  ["Fiji", "Fiji", "Pacific/Fiji"], ["Honolulu", "United States", "Pacific/Honolulu"],
  ["Tokyo", "Japan", "Asia/Tokyo"], ["Seoul", "South Korea", "Asia/Seoul"], ["Busan", "South Korea", "Asia/Seoul"],
  ["Beijing", "China", "Asia/Shanghai"], ["Shanghai", "China", "Asia/Shanghai"], ["Hong Kong", "China", "Asia/Hong_Kong"],
  ["Taipei", "Taiwan", "Asia/Taipei"], ["Manila", "Philippines", "Asia/Manila"], ["Singapore", "Singapore", "Asia/Singapore"],
  ["Kuala Lumpur", "Malaysia", "Asia/Kuala_Lumpur"], ["Jakarta", "Indonesia", "Asia/Jakarta"], ["Bangkok", "Thailand", "Asia/Bangkok"],
  ["Ho Chi Minh City", "Vietnam", "Asia/Ho_Chi_Minh"], ["Hanoi", "Vietnam", "Asia/Bangkok"],
  ["Mumbai", "India", "Asia/Kolkata"], ["Delhi", "India", "Asia/Kolkata"], ["Karachi", "Pakistan", "Asia/Karachi"],
  ["Dhaka", "Bangladesh", "Asia/Dhaka"], ["Dubai", "United Arab Emirates", "Asia/Dubai"], ["Riyadh", "Saudi Arabia", "Asia/Riyadh"],
  ["Doha", "Qatar", "Asia/Qatar"], ["Kuwait City", "Kuwait", "Asia/Kuwait"], ["Baghdad", "Iraq", "Asia/Baghdad"],
  ["Tehran", "Iran", "Asia/Tehran"], ["Amman", "Jordan", "Asia/Amman"], ["Beirut", "Lebanon", "Asia/Beirut"],
  ["Jerusalem (Al-Quds)", "Palestine", "Asia/Hebron"], ["Ramallah", "Palestine", "Asia/Hebron"], ["Nablus", "Palestine", "Asia/Hebron"],
  ["Hebron", "Palestine", "Asia/Hebron"], ["Bethlehem", "Palestine", "Asia/Hebron"], ["Gaza", "Palestine", "Asia/Gaza"],
  ["Khan Younis", "Palestine", "Asia/Gaza"], ["Cairo", "Egypt", "Africa/Cairo"], ["Istanbul", "Türkiye", "Europe/Istanbul"],
  ["Ankara", "Türkiye", "Europe/Istanbul"], ["Moscow", "Russia", "Europe/Moscow"], ["Saint Petersburg", "Russia", "Europe/Moscow"],
  ["Novosibirsk", "Russia", "Asia/Novosibirsk"], ["Vladivostok", "Russia", "Asia/Vladivostok"], ["Kyiv", "Ukraine", "Europe/Kyiv"],
  ["Warsaw", "Poland", "Europe/Warsaw"], ["Kraków", "Poland", "Europe/Warsaw"], ["Berlin", "Germany", "Europe/Berlin"],
  ["Munich", "Germany", "Europe/Berlin"], ["Vienna", "Austria", "Europe/Vienna"], ["Zurich", "Switzerland", "Europe/Zurich"],
  ["Rome", "Italy", "Europe/Rome"], ["Milan", "Italy", "Europe/Rome"], ["Madrid", "Spain", "Europe/Madrid"],
  ["Barcelona", "Spain", "Europe/Madrid"], ["Lisbon", "Portugal", "Europe/Lisbon"], ["Paris", "France", "Europe/Paris"],
  ["Brussels", "Belgium", "Europe/Brussels"], ["Amsterdam", "Netherlands", "Europe/Amsterdam"], ["London", "United Kingdom", "Europe/London"],
  ["Dublin", "Ireland", "Europe/Dublin"], ["Stockholm", "Sweden", "Europe/Stockholm"], ["Oslo", "Norway", "Europe/Oslo"],
  ["Helsinki", "Finland", "Europe/Helsinki"], ["Athens", "Greece", "Europe/Athens"], ["Bucharest", "Romania", "Europe/Bucharest"],
  ["Lagos", "Nigeria", "Africa/Lagos"], ["Nairobi", "Kenya", "Africa/Nairobi"], ["Johannesburg", "South Africa", "Africa/Johannesburg"],
  ["Casablanca", "Morocco", "Africa/Casablanca"],
  ["Minsk", "Belarus", "Europe/Minsk"], ["Chișinău", "Moldova", "Europe/Chisinau"], ["Vilnius", "Lithuania", "Europe/Vilnius"],
  ["Riga", "Latvia", "Europe/Riga"], ["Tallinn", "Estonia", "Europe/Tallinn"], ["Prague", "Czechia", "Europe/Prague"],
  ["Bratislava", "Slovakia", "Europe/Bratislava"], ["Budapest", "Hungary", "Europe/Budapest"], ["Ljubljana", "Slovenia", "Europe/Ljubljana"],
  ["Zagreb", "Croatia", "Europe/Zagreb"], ["Belgrade", "Serbia", "Europe/Belgrade"], ["Sarajevo", "Bosnia and Herzegovina", "Europe/Sarajevo"],
  ["Podgorica", "Montenegro", "Europe/Podgorica"], ["Skopje", "North Macedonia", "Europe/Skopje"], ["Tirana", "Albania", "Europe/Tirane"],
  ["Pristina", "Kosovo", "Europe/Belgrade"], ["Sofia", "Bulgaria", "Europe/Sofia"], ["Copenhagen", "Denmark", "Europe/Copenhagen"],
  ["Reykjavík", "Iceland", "Atlantic/Reykjavik"], ["Luxembourg", "Luxembourg", "Europe/Luxembourg"], ["Valletta", "Malta", "Europe/Malta"],
  ["Monaco", "Monaco", "Europe/Monaco"], ["Andorra la Vella", "Andorra", "Europe/Andorra"], ["Nicosia", "Cyprus", "Asia/Nicosia"],
  ["Tbilisi", "Georgia", "Asia/Tbilisi"], ["Yerevan", "Armenia", "Asia/Yerevan"], ["Baku", "Azerbaijan", "Asia/Baku"],
  ["Vaduz", "Liechtenstein", "Europe/Vaduz"], ["San Marino", "San Marino", "Europe/San_Marino"], ["Vatican City", "Vatican City", "Europe/Vatican"],
  ["Gibraltar", "Gibraltar", "Europe/Gibraltar"], ["Edinburgh", "United Kingdom", "Europe/London"], ["Frankfurt", "Germany", "Europe/Berlin"],
  ["Hamburg", "Germany", "Europe/Berlin"], ["Lyon", "France", "Europe/Paris"], ["Naples", "Italy", "Europe/Rome"], ["Porto", "Portugal", "Europe/Lisbon"],
  ["Kharkiv", "Ukraine", "Europe/Kyiv"], ["Odesa", "Ukraine", "Europe/Kyiv"], ["Gdańsk", "Poland", "Europe/Warsaw"], ["Wrocław", "Poland", "Europe/Warsaw"],
  ["Izmir", "Türkiye", "Europe/Istanbul"], ["São Paulo", "Brazil", "America/Sao_Paulo"], ["Rio de Janeiro", "Brazil", "America/Sao_Paulo"],
  ["Buenos Aires", "Argentina", "America/Argentina/Buenos_Aires"], ["Santiago", "Chile", "America/Santiago"], ["Lima", "Peru", "America/Lima"],
  ["Bogotá", "Colombia", "America/Bogota"], ["Mexico City", "Mexico", "America/Mexico_City"], ["New York", "United States", "America/New_York"],
  ["Miami", "United States", "America/New_York"], ["Toronto", "Canada", "America/Toronto"], ["Chicago", "United States", "America/Chicago"],
  ["Dallas", "United States", "America/Chicago"], ["Houston", "United States", "America/Chicago"], ["Denver", "United States", "America/Denver"],
  ["Phoenix", "United States", "America/Phoenix"], ["Los Angeles", "United States", "America/Los_Angeles"],
  ["San Francisco", "United States", "America/Los_Angeles"], ["Seattle", "United States", "America/Los_Angeles"],
  ["Vancouver", "Canada", "America/Vancouver"], ["Anchorage", "United States", "America/Anchorage"],
];

/** Zone ids never offered by name in search (a friend already saved on one keeps working). */
const HIDDEN_ZONE_IDS = new Set(["Asia/Jerusalem", "Asia/Tel_Aviv", "Israel"]);

function norm(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/_/g, " ");
}

/** Search cities and raw zone ids. Returns [{ label, sub, tz }] (max `limit`). */
export function searchZones(query, limit = 8) {
  const q = norm(query).trim();
  if (!q) return [];
  const out = [];
  const seen = new Set();
  for (const [city, country, tz] of CITIES) {
    if (norm(city).includes(q) || norm(country).includes(q)) {
      const key = city + tz;
      if (!seen.has(key)) { seen.add(key); out.push({ label: city, sub: country, tz }); }
    }
  }
  for (const tz of allTimeZones()) {
    if (out.length >= limit * 2) break;
    if (HIDDEN_ZONE_IDS.has(tz)) continue;
    if (norm(tz).includes(q) && !out.some((o) => o.tz === tz && o.label === zoneCity(tz))) {
      out.push({ label: zoneCity(tz), sub: tz, tz });
    }
  }
  const starts = (o) => (norm(o.label).startsWith(q) ? 0 : 1);
  return out.sort((a, b) => starts(a) - starts(b)).slice(0, limit);
}
