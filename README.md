# Przewodnik AR: kod QR, model 3D w przestrzeni, opis i awatar-lektor

Działa w przeglądarce telefonu, bez instalowania aplikacji (WebAR).

```
przewodnik-ar/
├── index.html     ← aplikacja (lista atrakcji + strona atrakcji ?a=<id>)
├── atrakcje.js    ← TU edytujesz treści: nazwy, opisy, ciekawostki, etykiety na modelu
├── qr.html        ← generator kodów QR do wydruku
├── plakat.html    ← AR na plakacie (MindAR): kamera + model wyskakujący z obrazka
├── plakaty.html   ← plakaty-znaczniki z kodem QR do wydruku
├── kreator.html   ← kreator: własne zdjęcie → znacznik AR → test → gotowy kod
├── ar-plakat.js   ← silnik AR na plakacie (MindAR + three.js), wspólny dla plakat/kreator
├── znaczniki/     ← obrazki-znaczniki (.jpg) i opcjonalnie skompilowane pliki .mind
└── modele/        ← modele 3D w formacie .glb
```

## Jak to działa

1. Przy atrakcji wisi kod QR z adresem typu `https://…/index.html?a=baszta`.
2. Telefon otwiera stronę, a [`<model-viewer>`](https://modelviewer.dev) (Google) pokazuje model 3D.
3. Przycisk **„Zobacz w AR”** uruchamia AR telefonu:
   - **Android**: WebXR w Chrome albo Google Scene Viewer (ARCore),
   - **iPhone**: AR Quick Look (ARKit); plik .usdz model-viewer wygeneruje sam z .glb.
4. Awatar czyta opis na głos (Web Speech API, głos polski z systemu) i podświetla czytane zdanie.
5. Odwiedzone atrakcje zbierają się jako „pieczątki” (pamięć przeglądarki).

## Uruchomienie: GitHub Pages (za darmo, ok. 5 minut)

AR i kamera wymagają **HTTPS**, więc otwarcie pliku z dysku nie wystarczy.

1. Załóż konto na github.com, a potem **New repository** → nazwa `przewodnik-ar` → *Public*.
2. **Add file → Upload files**: przeciągnij całą zawartość tego folderu (razem z folderem `modele`).
3. **Settings → Pages → Source: Deploy from a branch → main / root → Save**.
4. Po minucie strona jest dostępna pod `https://TWOJ-LOGIN.github.io/przewodnik-ar/`.
5. Otwórz `…/qr.html`, wydrukuj kody i zeskanuj je telefonem.

Alternatywy: Netlify Drop (app.netlify.com/drop: przeciągasz folder i gotowe) albo Cloudflare Pages.

Lokalny podgląd na komputerze (bez AR): `python3 -m http.server` w tym folderze, potem http://localhost:8000.

## Dodawanie własnej atrakcji

1. Wrzuć model `.glb` do `modele/`.
2. Dopisz obiekt w `atrakcje.js` (skopiuj istniejący i zmień `id`, `nazwa`, `opis`, `model`…).
3. Gotowe: atrakcja pojawi się na liście i w `qr.html`.

**Skąd brać modele 3D:**
- **Skan prawdziwego obiektu telefonem**: Polycam, Scaniverse, KIRI Engine (fotogrametria, eksport do GLB). Najlepsza opcja dla przewodnika po prawdziwych zabytkach.
- **Gotowe modele**: Sketchfab (filtr *Downloadable* + licencja CC), Poly Pizza, a dla zabytków także Europeana i muzea udostępniające modele 3D.
- **Własne**: Blender (darmowy) → *File → Export → glTF 2.0 (.glb)*.
- Trzymaj modele **poniżej ~10 MB** i w skali metrycznej (1 jednostka = 1 m).

**Etykiety na modelu (`punkty`)**: pozycję w metrach najłatwiej znaleźć w edytorze https://modelviewer.dev/editor/ (klikasz w model i odczytujesz współrzędne hotspota).

## AR na plakacie (MindAR)

Drugi tryb AR: zamiast stawiać model na podłodze, celujesz telefonem w **obrazek** (plakat, tablicę, ulotkę),
a model wyskakuje prosto z niego i trzyma się go, gdy chodzisz dookoła. Działa tak samo na Androidzie i iPhonie.

- Wejście: przycisk **„AR na plakacie”** na stronie atrakcji albo kod QR z **plakaty.html**.
- Przy pierwszym uruchomieniu telefon sam „uczy się” obrazka (kilkanaście sekund) i zapamiętuje wynik.
  Żeby start był natychmiastowy, wygeneruj plik `.mind` w kreatorze i dopisz `znacznikMind`.
- `orientacja: "sciana"`: plakat wisi, model stoi przed nim. `"stol"`: obrazek leży, model wyrasta w górę.
  Można to też przełączyć przyciskiem w trakcie oglądania.

### Własny plakat: kreator.html

1. Wybierz zdjęcie lub grafikę. Kreator pokaże punkty charakterystyczne i oceni, czy obrazek nadaje się na znacznik.
2. Wybierz model 3D (istniejący albo własny .glb).
3. **Testuj AR teraz**: od razu, bez wrzucania czegokolwiek na GitHub.
4. Pobierz pliki (obrazek, .mind, ewentualnie model) i skopiuj gotowy kod do `atrakcje.js`.

Dobry znacznik ma dużo szczegółów, ostre krawędzie i napisy. Słabe są gradienty, jednolite tło, powtarzalne wzory i błyszczący papier.

## Awatar-przewodnik 3D

Postać „Bartek” (`modele/przewodnik.glb`) ma 4 animacje: **Spoczynek** (oddycha, mruga), **Macha**, **Mowi** (usta + gesty), **Wskazuje**.

- **Strona atrakcji:** macha na powitanie (kliknięty macha znowu). Po „Opowiedz” wskazuje zabytek i mówi razem z lektorem.
- **AR na plakacie:** stoi obok modelu, macha, gdy telefon znajdzie plakat, i mówi przy lektorze.
- Ustawienia są w `atrakcje.js` → `window.PRZEWODNIK` (imię i model). Atrakcja może mieć własnego przewodnika
  (`przewodnik: "modele/inna-postac.glb"`) albo żadnego w AR (`bezPrzewodnika: true`).

**Własna postać:** wystarczy dowolny `.glb` z animacjami nazwanymi `Spoczynek`, `Macha`, `Mowi`, `Wskazuje`.
Brakujące nazwy zastąpi pierwsza dostępna animacja.
1. Postać: Ready Player Me, VRoid Studio (eksport VRM → Blender) albo własna z Blendera.
2. Animacje: **Mixamo** (mixamo.com, za darmo) → wgraj postać → wybierz np. *Idle*, *Waving*, *Talking*, *Pointing* → pobierz FBX.
3. Blender: zaimportuj FBX, w *Action Editor* nazwij akcje jak wyżej → *Export glTF 2.0 (.glb)* z zaznaczonymi animacjami.
4. Wrzuć plik do `modele/` i podmień `model` w `window.PRZEWODNIK`.

Postać jest generowana skryptem `tools/build_avatar.py`, w którym można zmienić kolory, proporcje i ruchy.

## Modele 3D w wysokiej jakości

Modele zabytków (wersja HQ) mają tekstury z mapami normalnych (kamień, dachówki, deski, tynk, trawa, woda, płótno)
i dużo detali: blanki, machikuły, okiennice, pochodnie, beczki, domek latarnika, łódkę, kozioł wiatraka, schody, worki z mąką.

| Model | Trójkąty | Rozmiar | Animacja |
|---|---|---|---|
| baszta.glb | ~13 700 | 1,2 MB | – |
| latarnia.glb | ~14 700 | 0,9 MB | Swiatlo (snop światła) |
| wiatrak.glb | ~7 600 | 0,8 MB | Smigla |

Generator: `tools/hq/modele_hq.py` (geometria), `tools/hq/tekstury.py` (tekstury), `tools/hq/siatki.py` (eksport GLB),
`tools/hq/podglad.py` (podgląd bez przeglądarki). Uruchom: `cd tools/hq && python3 modele_hq.py ../../modele`.
(Stary skrypt `tools/build_models.py` tworzy uproszczone wersje i nadpisałby modele HQ.)

### Zasady, żeby model dobrze działał na telefonie
- **Do 50–100 tys. trójkątów** na model (te tutaj mają 8–15 tys.).
- **Tekstury 512–2048 px**, w formacie JPG (PNG tylko, gdy potrzebna przezroczystość). Plik `.glb` najlepiej **poniżej 5–10 MB**.
- Skala w metrach, podstawa modelu na wysokości 0 (model stoi na podłodze w AR).
- Duży model (np. skan z Polycam) zmniejszysz za darmo w przeglądarce na **gltf.report** (zakładka Script →
  `simplify`, `textureCompress`) albo poleceniem `npx @gltf-transform/cli optimize wejscie.glb wyjscie.glb --texture-compress webp`.
- Skąd wziąć gotowe modele dobrej jakości: **Sketchfab** (filtr *Downloadable*, licencja CC BY, pobierz jako glTF/GLB),
  **Poly Haven** (CC0), skan własnego obiektu: **Polycam / Scaniverse / KIRI Engine** → eksport GLB.

## Pomysły na rozbudowę (ścieżka nauki AR)

| Etap | Co dodać | Technologia |
|---|---|---|
| ✅ 1 | Animowane modele (np. kręcące się śmigła wiatraka) | animacje w Blenderze, `animation-name` / `autoplay` w model-viewer |
| ✅ 2 | Model „przyklejony” do plakatu lub tablicy zamiast podłogi | **MindAR** (image tracking, WebAR) |
| 3 | Atrakcje pokazujące się według GPS, bez kodów QR | **AR.js** (location-based) |
| ✅ 4 | Awatar 3D, który stoi obok modelu i macha | model postaci z animacjami (np. Mixamo → Blender → GLB) |
| 5 | Pełna aplikacja z mapą, trwałym śledzeniem i treściami offline | **Unity + AR Foundation** (ARCore/ARKit) |
| 6 | Treści zakotwiczone w konkretnych miejscach na świecie | Google **Geospatial API** (ARCore); 8th Wall jest od 2026 r. open source (8thwall.org), ale hosting Nianticu zamknięto |

Plik `tools/build_models.py` pokazuje, jak wygenerować prosty model GLB z kodu.
