# Zwiedzaj z Aniołami – gra miejska (Toruń)

Adres gry: `https://marcinvbc.github.io/przewodnik-ar/anioly/`

## Jak działa
- **Kody QR przy figurach** prowadzą do torunskieanioly.pl (filmy przewodników). Gra skanuje je własnym skanerem
  (kamera telefonu) i rozpoznaje anioła: po fragmencie adresu (pole `aliasy` w `dane.js`), a jeśli adres nic nie mówi –
  po lokalizacji GPS (najbliższy anioł w promieniu 150 m). Gdy to nie wystarczy, pyta gracza „przy którym aniele stoisz”
  i zapamiętuje odpowiedź dla tego kodu. Przycisk „Film przewodnika” otwiera dokładnie zeskanowany adres.
- **Pierniki**: anioł +3, ukryta atrakcja +2 (+1 bez podpowiedzi), pytanie +1, podpowiedź −0,5.
- **Atrakcje** zalicza się lokalizacją („Znalazłem!” w promieniu 60 m).
- Postęp zostaje w telefonie (localStorage).

## Do zrobienia przez organizatora
1. **Kalibracja**: zakładka „Więcej” → stań przy każdej figurze → „Tu stoję”. Potem „Kopiuj dane kalibracji”
   i przenieś współrzędne do `dane.js` (obecne są przybliżone).
2. Zeskanuj w grze każdy oryginalny kod QR i sprawdź, czy rozpoznał właściwego anioła; jeśli adresy mają stały wzór,
   dopisz jego fragment do `aliasy`.
3. Uzupełnij imiona aniołów z Rynku 5 i spod Krzywej Wieży (nie znaleźliśmy ich w źródłach).
4. Kolejne anioły i atrakcje dodajesz w `dane.js` (tablice `ANIOLY`, `ATRAKCJE`, kolejność w `TRASA.etapy`).

## Testy bez wychodzenia z domu
`kody-testowe.html` – kody do wydruku (`ZZA:aniol:<id>`), a w „Więcej” tryb symulacji GPS.

Modele 3D to własne, stylizowane anioły z atrybutami miejsc (nie kopie rzeźb Małgorzaty Więcławskiej-Furyk).
Biblioteki: jsQR (Apache 2.0), qrcode-generator (MIT), three.js (MIT).
