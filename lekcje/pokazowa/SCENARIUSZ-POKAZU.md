# Scenariusz pokazu: Lekcja AR „Mikołaj Kopernik: astronom z Torunia”

Pokaz trwa ok. 15 minut. Potrzebne są: laptop z Chrome (najlepiej podłączony do projektora lub dużego ekranu),
1–3 telefony „uczniów” oraz wydrukowany znacznik lekcji (`lekcje/znacznik.html`, A4 w kolorze).

> **Tryb demo czy Supabase?** W trybie demo wszystko działa w jednej przeglądarce. „Uczniów” pokażesz wtedy
> w kolejnych kartach albo oknach laptopa. Żeby dołączyły **prawdziwe telefony**, potrzebny jest skonfigurowany Supabase
> (`lekcje/LEKCJE-INSTRUKCJA.md`, kroki 1–3), a dla AI krok 4.

---

## Przed pokazem (5 minut, dzień wcześniej)
1. Otwórz `…/lekcje/nauczyciel.html`.
2. Pobierz pliki ze strony **📂 Pliki do pokazu wgrywania** (`lekcje/pokazowa/pliki.html`) do jednego folderu na pulpicie.
3. Kliknij **Wczytaj gotową lekcję**, czyli lekcję zapasową, gdyby coś poszło nie tak przy wgrywaniu.
4. Przy pierwszym uruchomieniu włącz **✋ Gesty** i zezwól na kamerę. Model rozpoznawania dłoni zapisze się w przeglądarce.
5. Na telefonach otwórz raz `…/lekcje/uczen.html` i tryb **🎯 Wspólny znacznik**, zezwalając na kamerę.
   Telefon „nauczy się” znacznika (kilkanaście sekund), a na pokazie start będzie natychmiastowy.

---

## Część 1: przygotowanie lekcji (ok. 4 min)
**Mówisz:** *„Zamiast składać slajdy w PowerPoincie, wrzucam materiały, a system sam buduje lekcję w przestrzeni 3D.”*

1. W panelu nauczyciela wpisz temat „Mikołaj Kopernik” → **➕ Nowa lekcja**.
2. **Przeciągnij wszystkie pobrane pliki naraz** do pola „Materiały”:
   - `kopernik-slajdy.pdf` sam rozpada się na 8 slajdów (pokaż miniatury),
   - film, dwa modele 3D i schematy pojawiają się na liście.
3. Kliknij **✨ Zaplanuj z AI** (z Supabase i Claude) albo **⚡ Ułóż automatycznie** (tryb demo).
   **Mówisz:** *„AI dzieli materiał na sceny, dobiera modele do slajdów, pisze tekst dla przewodnika Bartka i układa quiz.”*
4. Kliknij kilka scen i pokaż **podgląd 3D** po prawej. Zmień układ jednej sceny (np. *Muzeum* → *Orbita*) i popraw tytuł.
5. Przejdź do gotowej lekcji zapasowej (**← Lekcje** → „Mikołaj Kopernik… (lekcja pokazowa)” → **✏️ Edytuj**) i pokaż dopracowany plan:
   6 scen, teksty Bartka, quiz w 5 scenach.

## Część 2: start i zapraszanie (ok. 2 min)
1. **▶ Rozpocznij lekcję** otwiera ekran na projektor (klawisz **F** chowa panel).
2. **📲 Zaproś** pokazuje duży kod QR i kod lekcji. „Uczniowie” skanują QR telefonami → wpisują imię → **🎯 Wspólny znacznik** (albo **🧊 Widok 3D**).
3. Pokaż, że licznik **👥** rośnie. **← Wróć do prezentacji** (albo Esc).
4. Opcjonalnie: w tym samym oknie wpisz adres e-mail i kliknij **Gmail**, żeby pokazać gotowe zaproszenie mailowe.

## Część 3: prowadzenie lekcji (ok. 7 min)
| Scena | Co pokazać | Co powiedzieć / zrobić |
|---|---|---|
| 1. Kim był Kopernik? | oś czasu, slajdy | **🔊 Przeczytaj tekst sceny**: Bartek mówi, telefony pokazują napisy |
| 2. Świat przed Kopernikiem | **sfera armilarna** (obraca się) | kliknij model, żeby go wyróżnić (strzałka nad nim, kamera podjeżdża). Na telefonach też. Poproś „ucznia”, żeby obszedł znacznik dookoła |
| 3. Film | film na dużym ekranie | **▶** w panelu: film startuje u wszystkich. Zatrzymaj w momencie, gdy Mars „cofa się” |
| 4. Rewolucja Kopernika | **planetarium**: planety krążą wokół Słońca | zadaj **quiz**: kliknij pytanie, uczniowie odpowiadają na telefonach, wyniki rosną na żywo, potem **✔ Pokaż poprawną** |
| 5. Pomnik w Toruniu | sfera armilarna + slajdy o pomniku | *„Kopernik na pomniku trzyma właśnie taką sferę jak ta przed wami.”* Quiz: co trzyma Kopernik? |
| 6. Podsumowanie | układ *Orbita*: każdy widzi inny element | pytanie do dyskusji z ostatniego slajdu |

**Efekt „wow”: sterowanie bez myszki** (włącz **✋ Gesty** albo **🎙 Głos**):
- 👋 machnięcie w lewo przełącza na następną scenę,
- ☝️ wskazanie palcem planetarium i przytrzymanie ok. 1 s wyróżnia je,
- 🤏 chwyt i ruch dłoni obraca scenę,
- 👍 kciuk w górę pokazuje poprawną odpowiedź w quizie,
- głosem: „dalej”, „pokaż model”, „quiz”, „pokaż odpowiedź”.

**Uczniowie:** ✋ „Mam pytanie” podświetla się u nauczyciela, a **💬 Zapytaj Bartka** (z Claude) odpowiada na pytania o Kopernika
na podstawie treści lekcji. Spróbuj: *„Dlaczego Kopernik trzyma kulę z obręczy?”*

## Część 4: zakończenie (1 min)
**Mówisz:** *„Nauczyciel wgrał zwykłe pliki, a powstała lekcja, którą każdy uczeń ogląda na swoim telefonie,
w swojej perspektywie, z quizem na żywo, bez instalowania aplikacji.”*

---

### Co jest w lekcji pokazowej
| Plik | Opis |
|---|---|
| `kopernik-slajdy.pdf` | 8 slajdów: biografia, model geocentryczny, heliocentryzm, „De revolutionibus”, pomnik w Toruniu, podsumowanie |
| `ziemia-czy-slonce.mp4` | film 36 s: porównanie modeli i pozorny ruch wsteczny Marsa |
| `planetarium-kopernika.glb` | animowany model 3D: mechaniczne planetarium (orrery) z Ziemią i Księżycem |
| `sfera-armilarna.glb` | animowany model 3D: sfera armilarna (oś nachylona jak na szerokości Torunia) |
| `model-*.jpg`, `os-czasu.jpg` | schematy i oś czasu |
| `lekcja.json` | gotowy plan: 6 scen, teksty Bartka, 7 pytań quizowych |

Źródła faktów: torun.pl (pomnik: odsłonięcie 25.10.1853, autorzy Ch. F. Tieck i J. H. Strack, odlew w Berlinie,
napis autorstwa prof. Rudolfa Brohma, rejestr zabytków 2023; biografia Kopernika), Archiwum PAN, materiały UŁ (pierwsze wydanie
„De revolutionibus”: Norymberga 1543). Ruch planet w modelu i filmie pokazano w umownej skali i tempie.
