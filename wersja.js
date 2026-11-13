/* Numer wersji aplikacji – widoczny na stronie i dopisywany do adresów modeli,
   żeby telefon (i aplikacja AR) pobrały nowe pliki zamiast starych z pamięci podręcznej. */
window.WERSJA = "18";
window.zWersja = url => url && !/^(blob:|data:|idb:)/.test(url) ? url + (url.includes("?") ? "&" : "?") + "v=" + window.WERSJA : url;
