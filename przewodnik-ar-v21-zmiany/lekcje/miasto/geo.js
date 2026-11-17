/*
 * Informacje o miejscu: działka ewidencyjna (ULDK GUGiK), adres (OpenStreetMap Nominatim),
 * wysokości sąsiednich budynków (OpenStreetMap Overpass), położenie Słońca (do cieni w AR).
 * Każde zapytanie ma limit czasu – w terenie internet bywa słaby, aplikacja działa i bez tych danych.
 */
const zCzasem = (url, ms = 9000, opcje = {}) => { const a = new AbortController(); const t = setTimeout(() => a.abort(), ms); return fetch(url, { ...opcje, signal: a.signal }).finally(() => clearTimeout(t)); };

/** Działka pod punktem GPS. Zwraca {id, numer, obreb, gmina, powiat, wojewodztwo, obrys:[[lat,lon]...]} albo null. */
export async function dzialka(lat, lon) {
  const url = `https://uldk.gugik.gov.pl/?request=GetParcelByXY&xy=${lon},${lat},4326&result=id,parcel,region,commune,county,voivodeship,geom_wkt&srid=4326`;
  const t = (await (await zCzasem(url)).text()).trim();
  const [status, wiersz] = t.split("\n");
  if (status.trim() !== "0" || !wiersz) return null;
  const pola = wiersz.split("|");
  const wkt = pola.find(p => /POLYGON/i.test(p)) || "";
  const [id, numer, obreb, gmina, powiat, woj] = pola;
  const wsp = (wkt.match(/\(\(([^)]+)\)/) || [])[1];
  const obrys = wsp ? wsp.split(",").map(p => p.trim().split(/\s+/).map(Number)).map(([x, y]) => (Math.abs(x) > 40 ? [x, y] : [y, x])) : [];   // [lat, lon]
  return { id, numer, obreb, gmina, powiat, wojewodztwo: woj, obrys, pole: obrys.length > 2 ? poleM2(obrys) : null };
}
/** Pole wielokąta [lat,lon] w m² (przybliżenie lokalne). */
export function poleM2(p) {
  const lat0 = p[0][0] * Math.PI / 180, kx = 111320 * Math.cos(lat0), ky = 110540;
  let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += (a[1] * kx) * (b[0] * ky) - (b[1] * kx) * (a[0] * ky); }
  return Math.abs(s / 2);
}

/** Adres najbliższego punktu (Nominatim). */
export async function adres(lat, lon) {
  const j = await (await zCzasem(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&accept-language=pl`)).json();
  const a = j.address || {};
  const ulica = [a.road || a.pedestrian || a.square || a.footway, a.house_number].filter(Boolean).join(" ");
  return { tekst: [ulica, a.suburb || a.quarter || a.neighbourhood, a.city || a.town || a.village].filter(Boolean).join(", "), pelny: j.display_name || "" };
}

/** Budynki w promieniu r m (OSM): liczba kondygnacji i wysokości – podpowiedź, jak dopasować projekt do otoczenia. */
export async function sasiedzi(lat, lon, r = 80) {
  const q = `[out:json][timeout:8];way(around:${r},${lat},${lon})["building"];out tags center 60;`;
  const j = await (await zCzasem("https://overpass-api.de/api/interpreter", 12000, { method: "POST", body: "data=" + encodeURIComponent(q) })).json();
  const b = (j.elements || []).map(e => ({ kond: parseFloat(e.tags["building:levels"]) || null, wys: parseFloat(e.tags.height) || null, typ: e.tags.building, nazwa: e.tags.name || "" }));
  const kond = b.map(x => x.kond).filter(Boolean).sort((a, b) => a - b), wys = b.map(x => x.wys || (x.kond ? x.kond * 3.1 + 1.5 : null)).filter(Boolean).sort((a, b) => a - b);
  const med = a => a.length ? a[Math.floor(a.length / 2)] : null;
  return { liczba: b.length, kondMediana: med(kond), kondMax: kond.length ? kond[kond.length - 1] : null, wysMediana: med(wys), znanychWys: wys.length };
}

/** Położenie Słońca (azymut od północy zgodnie z ruchem wskazówek zegara, wysokość nad horyzontem) – w stopniach. */
export function slonce(lat, lon, data = new Date()) {
  const rad = Math.PI / 180, d = (data.getTime() / 86400000) + 2440587.5 - 2451545.0;
  const g = (357.529 + 0.98560028 * d) * rad, q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dek = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24, lst = (gmst * 15 + lon) * rad, H = lst - ra, f = lat * rad;
  const wys = Math.asin(Math.sin(f) * Math.sin(dek) + Math.cos(f) * Math.cos(dek) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dek) * Math.cos(f) - Math.sin(f) * Math.cos(H));
  return { azymut: ((az / rad) + 360) % 360, wysokosc: wys / rad };
}
export const kierunek = az => ["płn.", "płn.-wsch.", "wsch.", "płd.-wsch.", "płd.", "płd.-zach.", "zach.", "płn.-zach."][Math.round(((az % 360) + 360) % 360 / 45) % 8];
export const linkGeoportal = id => `https://mapy.geoportal.gov.pl/imap/Imgp_2.html?identifyParcel=${encodeURIComponent(id)}`;
export const linkMapa = (lat, lon) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=19/${lat}/${lon}`;
