# Przewodnik AR: kod QR, model 3D w przestrzeni, opis i awatar-lektor

Działa w przeglądarce telefonu, bez instalowania aplikacji (WebAR).

```
przewodnik-ar/
├── index.html     ← aplikacja (lista atrakcji + strona atrakcji ?a=<id>)
├── atrakcje.js    ← TU edytujesz treści: nazwy, opisy, ciekawostki, etykiety na modelu
├── qr.html        ← generator kodów QR do wydruku
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

## Pomysły na rozbudowę (ścieżka nauki AR)

| Etap | Co dodać | Technologia |
|---|---|---|
| 1 | Animowane modele (np. kręcące się śmigła wiatraka) | animacje w Blenderze, `animation-name` / `autoplay` w model-viewer |
| 2 | Model „przyklejony” do plakatu lub tablicy zamiast podłogi | **MindAR** (image tracking, WebAR) |
| 3 | Atrakcje pokazujące się według GPS, bez kodów QR | **AR.js** (location-based) |
| 4 | Awatar 3D, który stoi obok modelu i macha | model postaci z animacjami (np. Mixamo → Blender → GLB) |
| 5 | Pełna aplikacja z mapą, trwałym śledzeniem i treściami offline | **Unity + AR Foundation** (ARCore/ARKit) |
| 6 | Treści zakotwiczone w konkretnych miejscach na świecie | Google **Geospatial API**, Niantic **8th Wall / Lightship** |

Plik `tools/build_models.py` pokazuje, jak wygenerować prosty model GLB z kodu.
