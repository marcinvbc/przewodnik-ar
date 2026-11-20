# Grafiki składników – podmiana na obrazy z Gemini

Układanka używa obrazów z tego folderu (wyrenderowanych z modeli 3D).
Jeśli wygenerujesz lepsze grafiki (np. w Gemini), wrzuć je do podfolderu **`gemini/`**
pod **tą samą nazwą pliku** – gra użyje ich automatycznie; brakujące zostaną z renderu.

## Wymagania, żeby warstwy pasowały do siebie
- PNG **z przezroczystym tłem**, 512 × 512 px (Gemini zwykle daje tło – usuń je np. w remove.bg lub Canva).
- Ten sam kadr dla wszystkich: widok z boku lekko z góry (~25°), składnik na środku,
  **szerokość składnika ok. 70% obrazu** (bułka ~360 px), **spód składnika w wierszu 320 px od góry**.
- Jednakowe, miękkie światło z lewej-góry, bez cienia na ziemi.

## Prompty (wklej do Gemini; po polsku lub angielsku)
Wspólny początek: *„Fotorealistyczne zdjęcie produktowe, widok z boku lekko z góry (25°), wyśrodkowane,
miękkie studyjne światło z lewej, na jednolitym białym tle, bez cieni, bez napisów i logo:”*

| plik | prompt (dopisz do wspólnego początku) |
|---|---|
| spod.png | spód bułki do hamburgera, opieczony przekrój do góry, złocista skórka po bokach |
| spodDuzy.png | spód większej bułki z sezamem, opieczony przekrój do góry |
| srodek.png | środkowa część bułki (oba przekroje opieczone), płaski krążek |
| korona.png | wierzch bułki do hamburgera, gładka złocista kopuła |
| koronaSez.png | wierzch bułki z sezamem, złocista kopuła posypana sezamem |
| wolowina.png | usmażony kotlet wołowy z mielonego mięsa, ślady grilla, grubość ok. 1 cm |
| ser.png | plaster topionego sera cheddar, lekko roztopiony, rogi zwisają |
| ketchup.png | spirala ketchupu (porcja) na niewidocznej powierzchni |
| musztarda.png | spirala żółtej musztardy (porcja) |
| sosSpec.png | spirala pomarańczowo-różowego sosu do burgerów |
| cebulka.png | garstka drobno siekanej białej cebulki rozsypana w okrąg |
| ogorek2.png | dwa plasterki ogórka konserwowego obok siebie |
| salata.png | garść szatkowanej sałaty lodowej rozsypana w okrąg |
| pomidor2.png | dwa plastry pomidora obok siebie |

Uwaga: grafiki i nazwy nie mogą zawierać logo ani znaków towarowych sieci restauracji, chyba że restauracja ma do nich prawa.
