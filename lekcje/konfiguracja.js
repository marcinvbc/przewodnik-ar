/*
 * KONFIGURACJA LEKCJI AR
 * ----------------------
 * Puste pola = TRYB DEMO: wszystko działa w jednej przeglądarce (nauczyciel i „uczniowie” w kartach tego samego
 * komputera), pliki zapisują się tylko lokalnie. Idealne do wypróbowania.
 *
 * Żeby uczniowie mogli dołączać z własnych telefonów, załóż darmowy projekt Supabase (instrukcja: LEKCJE-INSTRUKCJA.md)
 * i wklej tu dwie wartości z: Supabase → Project Settings → API Keys / Data API.
 * Klucz „publishable” (albo „anon”) jest jawny z założenia – można go bezpiecznie trzymać w tym pliku.
 * NIGDY nie wklejaj tu klucza „secret/service_role” ani klucza Claude API!
 */
window.LEKCJE_CONFIG = {
  supabaseUrl: "",          // np. "https://abcdefghijkl.supabase.co"
  supabaseKey: "",          // klucz publishable (sb_publishable_…) albo anon (eyJ…)
  aiWlaczone: true,         // czy próbować planowania i pytań przez Claude (wymaga funkcji „claude” w Supabase)
};
