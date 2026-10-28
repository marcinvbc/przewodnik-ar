# Lekcja AR: instrukcja dla nauczyciela

Lekcja AR to prezentacja w rozszerzonej rzeczywistości zamiast PowerPointa. Nauczyciel wgrywa slajdy (PDF), filmy,
zdjęcia i modele 3D, AI układa z nich sceny, a uczniowie oglądają je na swoich telefonach. Każdy widzi wspólną
scenę ze swojego miejsca w klasie.

| Strona | Dla kogo | Co robi |
|---|---|---|
| `lekcje/nauczyciel.html` | nauczyciel | lekcje, wgrywanie plików, planowanie scen (AI/automatycznie), edycja, quizy |
| `lekcje/prowadzenie.html` | nauczyciel (projektor) | prowadzenie na żywo: sceny, wyróżnianie, filmy, quiz z wynikami, zaproszenia |
| `lekcje/uczen.html` | uczniowie | dołączanie kodem/QR, oglądanie: znacznik / ławka / 3D, quiz, reakcje, pytania do Bartka |
| `lekcje/znacznik.html` | do druku | wspólny znacznik klasy (jeden na wszystkie lekcje) |

---

## 🔭 Lekcja pokazowa (Kopernik)
W panelu nauczyciela kliknij **Wczytaj gotową lekcję**: „Mikołaj Kopernik – astronom z Torunia” (slajdy, film, 2 animowane modele 3D, quiz).
Pliki do pokazania procesu wgrywania i scenariusz pokazu: `lekcje/pokazowa/pliki.html` i `lekcje/pokazowa/SCENARIUSZ-POKAZU.md`.

## Szybki start: tryb demo (bez zakładania kont)

Od razu po wgraniu na GitHub Pages wejdź na `…/lekcje/nauczyciel.html`. Na górze zobaczysz **TRYB DEMO**.

- Wszystko działa w **jednej przeglądarce**: lekcje i pliki zapisują się lokalnie.
- „Uczniów” możesz symulować w kolejnych kartach tej samej przeglądarki (`uczen.html`).
- Planowanie przez AI i „Zapytaj Bartka” są wyłączone, działa układ automatyczny.

Żeby uczniowie łączyli się **ze swoich telefonów**, potrzebny jest Supabase (krok 1–4 poniżej, ok. 15 minut).

---

## Krok 1: projekt Supabase (darmowy)

1. Wejdź na **supabase.com** → *Start your project* → zaloguj się (np. kontem GitHub).
2. **New project**: nazwa np. `lekcja-ar`, ustaw hasło bazy (zapisz je), region **Central EU (Frankfurt)**.
3. Poczekaj 1–2 minuty, aż projekt się utworzy.

> Darmowy plan: ok. 1 GB na pliki, maksymalnie **50 MB na jeden plik**, do 200 jednoczesnych połączeń.
> Projekt **usypia po tygodniu bez używania**. Budzisz go jednym kliknięciem w panelu Supabase („Restore”).

## Krok 2: baza danych i miejsce na pliki

1. W projekcie otwórz **SQL Editor** → **New query**.
2. Wklej całą zawartość pliku `supabase/schema.sql` i kliknij **Run**. Powinno pojawić się „Success”.
   Skrypt tworzy tabelę lekcji, zabezpieczenia (każdy nauczyciel widzi tylko swoje lekcje) i miejsce na pliki `lekcje`.
3. **Authentication → Sign In / Providers → Email**: zostaw włączone.
   Dla wygody możesz wyłączyć **Confirm email**, wtedy konto działa od razu, bez klikania linku w mailu.

## Krok 3: połącz stronę z Supabase

1. **Project Settings → API Keys**: skopiuj klucz **publishable** (`sb_publishable_…`) albo starszy **anon**.
2. **Project Settings → Data API** (albo strona główna projektu): skopiuj **Project URL** (`https://xxxx.supabase.co`).
3. Na GitHubie otwórz `lekcje/konfiguracja.js` → ✏️ Edit i wpisz:
   ```js
   supabaseUrl: "https://xxxx.supabase.co",
   supabaseKey: "sb_publishable_xxxxxxxx",
   ```
   → **Commit changes**.

⚠️ Wpisuj tylko klucz **publishable/anon**. Ten klucz jest jawny z założenia. **Nigdy** nie wpisuj tu klucza *secret / service_role*
ani klucza Claude API.

Od teraz `nauczyciel.html` pokazuje ekran logowania. **Załóż konto nauczyciela** i gotowe.

## Krok 4: Claude (AI planuje sceny, Bartek odpowiada na pytania)

1. Klucz Claude API: wejdź na **console.anthropic.com** (Claude Console), załóż konto, w *Billing* doładuj konto
   (np. 5 USD wystarcza na bardzo wiele lekcji), potem *API Keys* → **Create Key** i skopiuj klucz (`sk-ant-…`).
2. W Supabase: **Edge Functions** → **Deploy a new function** → **Via Editor**.
   - Nazwa funkcji: **`claude`** (dokładnie tak).
   - Usuń przykładowy kod i wklej całą zawartość pliku `supabase/functions/claude/index.ts` → **Deploy**.
3. **Edge Functions → Secrets** (albo *Manage secrets*) → dodaj sekret:
   - `ANTHROPIC_API_KEY` = Twój klucz `sk-ant-…`
4. W ustawieniach funkcji `claude` wyłącz **Verify JWT / Enforce JWT verification**. Uczniowie nie mają kont,
   a funkcja sama sprawdza, czy planowanie zleca zalogowany nauczyciel.

Opcjonalne sekrety: `CLAUDE_MODEL` (model do planowania lekcji, domyślnie `claude-sonnet-5-5`) i `CLAUDE_MODEL_SZYBKI`
(model do szybkich odpowiedzi, domyślnie `claude-haiku-5-5`).

Klucz Claude jest przechowywany tylko w Supabase, a przeglądarki uczniów nigdy go nie widzą. Koszty: płacisz za faktyczne użycie.
Ułożenie lekcji to jedno zapytanie, a odpowiedź Bartka to ułamek centa. W Claude Console możesz ustawić **limit wydatków**.

Po tym kroku przycisk **✨ Zaplanuj z AI** układa sceny, pisze tekst dla Bartka i quiz. W widoku ucznia oraz na
stronach atrakcji przewodnika pojawia się **💬 Zapytaj Bartka**.

---

## Jak poprowadzić lekcję

1. **Przygotowanie** (`nauczyciel.html`):
   - Nowa lekcja → przeciągnij pliki. Prezentację PowerPoint zapisz jako **PDF** (*Plik → Zapisz jako → PDF*), wtedy każda strona stanie się slajdem.
   - **✨ Zaplanuj z AI** (albo **⚡ Ułóż automatycznie**) → popraw tytuły, kolejność, układ sceny, tekst Bartka i quiz.
   - Podgląd 3D po prawej pokazuje, jak będzie wyglądać scena.
2. **Znacznik**: wydrukuj `znacznik.html` (A4/A3, w kolorze, matowy papier). Połóż na biurku albo przypnij do tablicy.
   Znacznik jest wspólny dla wszystkich lekcji.
3. **Start**: **▶ Rozpocznij lekcję** i wyświetl ekran na projektorze (klawisz **F** chowa panel boczny).
4. **Zapraszanie**:
   - **📲 Zaproś** pokazuje duży kod QR i kod lekcji. Uczniowie skanują, a Ty klikasz **← Wróć do prezentacji** (albo Esc).
   - W tym samym oknie wpiszesz adresy e-mail. Otworzy się Twoja poczta (program, Gmail lub Outlook) z gotowym zaproszeniem, a adresy trafią do pola UDW.
   - Kod lekcji widać cały czas w rogu ekranu, więc spóźnialscy też dołączą.
5. **Prowadzenie**:
   - **← →** zmieniają sceny, a telefony uczniów przełączają się same.
   - Kliknięcie elementu (na liście albo w scenie) **wyróżnia go**: strzałka nad nim, reszta przygasa, kamera podjeżdża.
   - Film: ▶/⏸ w panelu, u uczniów odtwarza się zsynchronizowany (domyślnie bez dźwięku, bo dźwięk leci z projektora).
   - **🔊 Przeczytaj tekst sceny**: Bartek czyta narrację, a na telefonach pojawiają się napisy.
   - **Quiz**: kliknij pytanie, uczniowie odpowiadają na telefonach, Ty widzisz wyniki na żywo, potem **✔ Pokaż poprawną**.
   - Uczniowie mogą podnieść rękę (✋), wysłać 👍/😮 albo zapytać Bartka (AI odpowiada na podstawie treści lekcji).

### ✋ Gesty i 🎙 głos (nauczyciel)
Na ekranie prowadzenia kliknij **✋ Gesty** (klawisz **G**). Kamera laptopa śledzi Twoją dłoń, a w rogu widać mały podgląd ze szkieletem dłoni.
Obraz z kamery jest analizowany w przeglądarce i **nigdzie nie jest wysyłany**.

| Gest | Działanie |
|---|---|
| 👋 machnięcie dłonią w lewo / w prawo | następna / poprzednia scena |
| ☝️ wskazanie palcem (na ekranie pojawia się kursor), przytrzymaj ok. 1 s na elemencie | wyróżnienie elementu |
| ✋ otwarta dłoń nieruchomo ok. 1 s | zdjęcie wyróżnienia |
| 🤏 chwyt (kciuk + palec wskazujący) i ruch | obrót sceny; przybliżenie dłoni do kamery = zoom |
| 👍 kciuk w górę | quiz: pokaż/ukryj odpowiedź; poza quizem Bartek czyta tekst sceny |
| ✊ pięść | film start / pauza |
| ✌️ znak V | okno zaproszenia (otwórz/zamknij) |

**🎙 Głos** (klawisz **V**, najlepiej w Chrome lub Edge): „dalej”, „wstecz”, „scena trzy”, „pokaż model”, „pokaż slajd dwa”,
„pokaż <nazwa>”, „odznacz”, „quiz”, „pokaż odpowiedź”, „przeczytaj”, „film start / stop”, „zaproś”, „zamknij”, „pełny ekran”.
Rozpoznawaną komendę widać w lewym górnym rogu. Uwaga: w Chrome rozpoznawanie mowy korzysta z serwerów Google.

Wskazówki: stań 1–2 m od kamery, dłoń trzymaj na wysokości klatki piersiowej i zadbaj o dobre światło.
Machnięcie musi być wyraźne: około pół szerokości obrazu w mniej niż pół sekundy.

### 🤏 Uczeń: „chwytanie” sceny
W widoku ucznia przycisk **🤏 Chwyć** włącza gesty: w trybie znacznika używa tylnej kamery (druga ręka przed telefonem),
w widoku 3D – przedniej. Chwyć i przesuń w bok = obrót, w górę/dół = powiększenie (w AR), ✋ = powrót do widoku nauczyciela.

### Tryby oglądania u ucznia
| Tryb | Jak działa | Wymagania |
|---|---|---|
| 🎯 **Wspólny znacznik** (zalecany) | wszyscy celują w znacznik na biurku, a scena stoi w klasie i każdy widzi ją ze swojej strony | kamera; Android i iPhone |
| 🪑 **Na mojej ławce** | uczeń stawia scenę na swoim stole | Android z Chrome i ARCore (na iPhonie Safari nie obsługuje WebXR) |
| 🧊 **Widok 3D** | obracanie palcem, bez kamery | każdy telefon |

Przyciski ＋/－ zmieniają wielkość sceny, a przycisk **Znacznik: leży / wisi** służy do znacznika przypiętego do tablicy.

---

## Prywatność i bezpieczeństwo (szkoła)
- Uczniowie **nie zakładają kont**. Podają tylko imię widoczne dla nauczyciela w czasie lekcji (nie jest nigdzie zapisywane).
- Adresy e-mail z okna zaproszeń zostają w przeglądarce nauczyciela. Wiadomość wysyła Twoja własna poczta.
- Pliki lekcji są publiczne pod trudnym do odgadnięcia adresem, a lekcję można otworzyć tylko znając jej kod.
  Nie wgrywaj materiałów z danymi osobowymi uczniów.
- Kanał na żywo jest otwarty dla każdego, kto zna kod lekcji. Po zajęciach możesz wygenerować nową lekcję (nowy kod).
- Pytania do Bartka trafiają do Claude API (Anthropic) razem z treścią lekcji. Uprzedź o tym uczniów.

## Najczęstsze problemy
| Problem | Rozwiązanie |
|---|---|
| „plik ma XX MB, limit to 50 MB” | zmniejsz film (np. HandBrake, preset „Fast 720p30”) albo podziel go |
| AI: „Brak sekretu ANTHROPIC_API_KEY” | dodaj sekret w Supabase (krok 4.3) |
| AI: 401 / „Zaloguj się jako nauczyciel” | zaloguj się ponownie w panelu; sprawdź, czy wyłączyłeś Verify JWT (krok 4.4) |
| uczeń: „Nie ma lekcji o takim kodzie” | sprawdź kod; w trybie demo uczniowie muszą być w tej samej przeglądarce |
| znacznik nie jest rozpoznawany | lepsze światło, matowy wydruk, cały znacznik w kadrze, A3 dla dużej klasy |
| projekt Supabase „Paused” | panel Supabase → **Restore project** (darmowy plan usypia po tygodniu) |
