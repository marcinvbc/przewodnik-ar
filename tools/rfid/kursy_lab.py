# Buduje dwie paczki kursów e-peAR do laboratorium RFID (format Pomocnika, wersja 2):
#   „RFID – prześwietlenie tagów”  i  „RFID – montaż bramki UHF”.
# Plansze: HTML -> JPG (Playwright), modele: modele/rfid/*.glb, rendery: /tmp/kursy/r/*.png
# Uruchom z katalogu repo przy działającym serwerze http://127.0.0.1:8765
import asyncio, json, zipfile, base64, io, os, sys
from playwright.async_api import async_playwright
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REND = "/tmp/kursy/r"; OUT = "/tmp/kursy"
C = 0.0733
TP, TR = [-0.78, 1.23, -0.2], 8          # tekst
P1, P1R = [-2.4, 1.4, 1.7], 316          # plansza z lewej
P2, P2R = [2.4, 1.4, 1.7], 44            # plansza z prawej
LINK = "https://marcinvbc.github.io/przewodnik-ar/lekcje/rfid.html"

def img64(nazwa):
    im = Image.open(f"{REND}/{nazwa}.png").convert("RGB"); b = io.BytesIO(); im.save(b, "JPEG", quality=88)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()

CSS = """*{box-sizing:border-box;margin:0}body{width:1600px;height:1000px;font-family:'DejaVu Sans',system-ui,sans-serif;background:#f4f6f8;color:#16232a;overflow:hidden}
header{background:#0d1824;color:#fff;padding:34px 50px 26px;border-bottom:8px solid #1e88e5}h1{font-size:56px;font-weight:800}header p{color:#9ec9f0;font-size:26px;margin-top:8px}
main{padding:36px 50px}.g{display:grid;gap:26px}.k{background:#fff;border-radius:18px;padding:22px 24px;box-shadow:0 2px 10px #0d18241a}
h3{font-size:28px;margin-bottom:10px}li{font-size:22px;line-height:1.45;color:#3a4a55;margin-left:24px}.m{color:#5a6b76;font-size:21px}
img.r{width:100%;border-radius:14px;display:block;background:#eef0f2}.nr{display:inline-grid;place-items:center;width:46px;height:46px;border-radius:50%;background:#1e88e5;color:#fff;font-weight:800;font-size:24px;margin-right:12px}
table{border-collapse:collapse;width:100%;font-size:22px;background:#fff;border-radius:14px;overflow:hidden}th,td{padding:13px 14px;text-align:left;border-bottom:1px solid #e3e8ec}th{background:#16232a;color:#fff;font-size:21px}td:first-child{font-weight:700}
.chip{display:inline-block;background:#e3f1fd;color:#0d4f8a;border-radius:20px;padding:4px 14px;font-size:20px;margin:3px 4px 0 0}"""

def strona(tytul, pod, tresc): return f"<!doctype html><html><head><meta charset=utf-8><style>{CSS}</style></head><body><header><h1>{tytul}</h1><p>{pod}</p></header><main>{tresc}</main></body></html>"

# ---------------------------------------------------------------- plansze
def plansze():
    T = {}
    tagi = [("kartaHF_0.55", "Karta HF", "13,56 MHz · do 10 cm", "dostęp, legitymacje"),
            ("tagUHF_0", "Inlay UHF", "865–868 MHz · do 10 m", "logistyka, handel"),
            ("kapsulaLF_0.6", "Kapsułka LF", "134,2 kHz · do 20 cm", "zwierzęta"),
            ("tagNaMetal_0.6", "Tag na metal", "UHF · 2–6 m na stali", "kontenery, narzędzia"),
            ("opaskaHF_0", "Opaska NFC", "13,56 MHz · 2–4 cm", "basen, festiwal, szpital")]
    T["A1"] = strona("Pięć tagów – jedna zasada", "Każdy tag = antena dopasowana do pasma + chip. Rozłóż modele w AR i porównaj ich wnętrze",
        '<div class="g" style="grid-template-columns:repeat(5,1fr)">' + "".join(f'<div class="k" style="padding:14px"><img class="r" src="{img64(r)}" style="height:360px;object-fit:cover"><h3 style="margin-top:14px;font-size:27px">{n}</h3><span class="chip">{p}</span><p class="m" style="margin-top:10px">{z}</p></div>' for r, n, p, z in tagi) + '</div>'
        '<div class="k" style="margin-top:28px;display:flex;gap:40px;align-items:center"><b style="font-size:26px">Jak oglądać?</b><span class="m">① obróć model palcami &nbsp; ② włącz <b>rozłożenie</b> – warstwy odsuną się &nbsp; ③ otwórz <b>listę części</b> i czytaj opisy &nbsp; ④ znajdź w każdym tagu <b>antenę</b> i <b>chip</b></span></div>')
    T["A2"] = strona("Dlaczego metal przeszkadza?", "Zwykła etykieta UHF na puszce nie zadziała – tag na metal jest zbudowany inaczej", """
<div class="g" style="grid-template-columns:1fr 1fr">
<div class="k"><h3>❌ Zwykła etykieta na metalu</h3><svg viewBox="0 0 680 380" width="100%"><rect x="40" y="290" width="600" height="40" fill="#9aa4ad"/><text x="340" y="318" text-anchor="middle" font-size="22" fill="#fff">STAL</text>
<rect x="250" y="282" width="180" height="8" fill="#c9cdd1"/><path d="M80 110 Q340 50 600 110" stroke="#1e88e5" stroke-width="5" fill="none" marker-end="url(#a)"/><text x="340" y="40" text-anchor="middle" font-size="22" fill="#1e88e5">fala z czytnika</text>
<path d="M250 270 q20-30 40 0 q20 30 40 0 q20-30 40 0 q20 30 40 0" stroke="#e53935" stroke-width="4" fill="none"/><text x="340" y="240" text-anchor="middle" font-size="22" fill="#e53935">prądy w metalu znoszą pole</text>
<text x="340" y="365" text-anchor="middle" font-size="22" fill="#3a4a55">antena „zwarta” – brak zasilania chipu</text><defs><marker id="a" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6z" fill="#1e88e5"/></marker></defs></svg></div>
<div class="k"><h3>✅ Tag na metal</h3><svg viewBox="0 0 680 380" width="100%"><rect x="40" y="290" width="600" height="40" fill="#9aa4ad"/><text x="340" y="318" text-anchor="middle" font-size="22" fill="#fff">STAL</text>
<rect x="230" y="280" width="220" height="10" fill="#c87533"/><rect x="230" y="235" width="220" height="45" fill="#e9d89a"/><rect x="245" y="225" width="190" height="10" fill="#c87533"/><rect x="230" y="235" width="8" height="45" fill="#c87533"/>
<text x="462" y="222" font-size="19" fill="#3a4a55">łatka miedziana</text><text x="462" y="262" font-size="19" fill="#3a4a55">przekładka</text><text x="462" y="287" font-size="19" fill="#3a4a55">masa</text>
<path d="M340 215 L340 90" stroke="#43a047" stroke-width="5" marker-end="url(#b)"/><path d="M300 215 L230 110" stroke="#43a047" stroke-width="4" marker-end="url(#b)"/><path d="M380 215 L450 110" stroke="#43a047" stroke-width="4" marker-end="url(#b)"/>
<text x="340" y="60" text-anchor="middle" font-size="22" fill="#43a047">promieniuje w górę – metal działa jak lustro</text><text x="340" y="365" text-anchor="middle" font-size="22" fill="#3a4a55">antena odsunięta od metalu o kilka mm</text>
<defs><marker id="b" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6z" fill="#43a047"/></marker></defs></svg></div></div>
<div class="k" style="margin-top:26px"><ul><li>Na metalu zwykły dipol UHF traci dopasowanie i zasięg spada praktycznie do zera.</li><li>Tag na metal: antena łatkowa nad płaszczyzną masy + dielektryczny dystans – metal staje się częścią anteny.</li><li>Ciecze (woda, napoje) też tłumią UHF – na butelki i ludzi lepiej sprawdza się HF.</li></ul></div>""")
    T["A3"] = strona("Porównanie tagów", "Pasmo decyduje o zasięgu, rozmiarze anteny i odporności na otoczenie", """
<table><tr><th>Tag</th><th>Pasmo / norma</th><th>Sprzężenie</th><th>Antena</th><th>Zasięg</th><th>Metal / woda</th><th>Typowe zastosowanie</th></tr>
<tr><td>Kapsułka LF</td><td>134,2 kHz · ISO 11784/85</td><td>magnetyczne</td><td>setki zwojów na ferrycie</td><td>do 20 cm</td><td>dobrze / dobrze</td><td>znakowanie zwierząt</td></tr>
<tr><td>Karta HF</td><td>13,56 MHz · ISO 14443</td><td>magnetyczne</td><td>3–6 zwojów, duża pętla</td><td>do 10 cm</td><td>słabo / dobrze</td><td>dostęp, płatności, legitymacje</td></tr>
<tr><td>Opaska NFC</td><td>13,56 MHz · ISO 14443 / NFC</td><td>magnetyczne</td><td>mała cewka ok. 2 cm</td><td>2–4 cm</td><td>słabo / dobrze</td><td>szafki, bilety, pacjenci</td></tr>
<tr><td>Inlay UHF</td><td>865–868 MHz · EPC Gen2 (ISO 18000-63)</td><td>backscatter (fala)</td><td>dipol λ/2 w meandrach</td><td>do 10 m</td><td>źle / źle</td><td>palety, odzież, inwentaryzacja</td></tr>
<tr><td>Tag na metal</td><td>865–868 MHz · EPC Gen2</td><td>backscatter (fala)</td><td>łatka nad masą + dystans</td><td>2–6 m</td><td>bardzo dobrze / średnio</td><td>kontenery, narzędzia, IT</td></tr></table>
<div class="g" style="grid-template-columns:1fr 1fr 1fr;margin-top:26px"><div class="k"><h3>Niżej częstotliwość</h3><p class="m">większa cewka, mniejszy zasięg, lepiej przez wodę i tkanki</p></div><div class="k"><h3>Wyżej częstotliwość</h3><p class="m">mała antena, duży zasięg, wiele tagów naraz – ale czuła na metal i wodę</p></div><div class="k"><h3>Ten sam chip?</h3><p class="m">etykieta UHF i tag na metal mogą mieć identyczny chip – różnią się anteną i konstrukcją</p></div></div>""")
    sc = [("1", "Paleta stalowych butli gazowych", "inwentaryzacja z wózka widłowego, 3 m"), ("2", "Karnet na basen", "zamykanie szafki, woda, chlor"),
          ("3", "Paszport psa", "weterynarz odczytuje czytnikiem ręcznym"), ("4", "Karton z odzieżą", "bramka w magazynie, 40 kartonów naraz"),
          ("5", "Legitymacja studencka", "wejście do laboratorium, czytnik przy drzwiach"), ("6", "Laptop w szafie serwerowej", "spis sprzętu raz na kwartał")]
    T["A4"] = strona("Zadanie: dobierz tag", "Do każdej sytuacji wybierz jeden z pięciu tagów i uzasadnij: pasmo, zasięg, otoczenie",
        '<div class="g" style="grid-template-columns:1fr 1fr 1fr">' + "".join(f'<div class="k" style="min-height:190px"><h3><span class="nr">{n}</span>{t}</h3><p class="m" style="margin-top:8px">{d}</p></div>' for n, t, d in sc) + '</div>'
        '<div class="k" style="margin-top:26px"><span class="m">Do wyboru: <span class="chip">kapsułka LF</span><span class="chip">karta HF</span><span class="chip">opaska NFC</span><span class="chip">inlay UHF</span><span class="chip">tag UHF na metal</span> &nbsp;·&nbsp; Odpowiedzi sprawdzisz w quizie kursu.</span></div>')
    # ---- bramka
    T["B1"] = strona("Bramka UHF – schemat połączeń", "Co z czym łączymy na stanowisku w laboratorium", """
<svg viewBox="0 0 1500 640" width="1500"><style>.b{fill:#fff;stroke:#16232a;stroke-width:3;rx:16}.t{font-size:24px;fill:#16232a;font-weight:700}.s{font-size:19px;fill:#5a6b76}.l{stroke-width:5;fill:none}</style>
<g><rect class="b" x="20" y="40" width="250" height="90"/><text class="t" x="40" y="80">Antena L1</text><text class="s" x="40" y="110">dolna, lewy słup</text>
<rect class="b" x="20" y="160" width="250" height="90"/><text class="t" x="40" y="200">Antena L2</text><text class="s" x="40" y="230">górna, lewy słup</text>
<rect class="b" x="20" y="280" width="250" height="90"/><text class="t" x="40" y="320">Antena P1</text><text class="s" x="40" y="350">dolna, prawy słup</text>
<rect class="b" x="20" y="400" width="250" height="90"/><text class="t" x="40" y="440">Antena P2</text><text class="s" x="40" y="470">górna, prawy słup</text></g>
<g stroke="#16232a" class="l"><path d="M270 85 H460 V200 H520"/><path d="M270 205 H440 V230 H520"/><path d="M270 325 H440 V260 H520"/><path d="M270 445 H460 V290 H520"/></g>
<text class="s" x="300" y="70">kabel koncentryczny, równe długości</text>
<rect class="b" x="520" y="160" width="300" height="170" style="fill:#16232a"/><text x="545" y="205" font-size="26" fill="#fff" font-weight="800">Czytnik UHF</text><text x="545" y="240" font-size="20" fill="#9ec9f0">ANT1 · ANT2 · ANT3 · ANT4</text><text x="545" y="275" font-size="20" fill="#9ec9f0">GPI 1–2 · GPO 1–2</text><text x="545" y="310" font-size="20" fill="#9ec9f0">Ethernet · 24 V</text>
<rect class="b" x="520" y="430" width="300" height="90"/><text class="t" x="540" y="470">Fotokomórki</text><text class="s" x="540" y="500">wejście + kierunek → GPI</text>
<path d="M670 430 V330" stroke="#e53935" class="l"/>
<rect class="b" x="980" y="40" width="320" height="90"/><text class="t" x="1000" y="80">Lampa</text><text class="s" x="1000" y="110">zielona / czerwona ← GPO</text><path d="M820 200 H900 V85 H980" stroke="#43a047" class="l"/>
<rect class="b" x="980" y="200" width="300" height="130"/><text class="t" x="1000" y="240">Skrzynka sterująca</text><text class="s" x="1000" y="272">PLC / komputer przemysłowy</text><text class="s" x="1000" y="300">switch, zasilacz 24 V</text><path d="M820 265 H980" stroke="#1e88e5" class="l"/>
<rect class="b" x="1330" y="200" width="160" height="130" style="fill:#e3f1fd"/><text class="t" x="1350" y="250">System</text><text class="t" x="1350" y="285">WMS</text><path d="M1280 265 H1330" stroke="#1e88e5" class="l"/>
<path d="M1130 330 V420 H820" stroke="#f9a825" class="l"/><text class="s" x="900" y="410">zasilanie 24 V</text></svg>
<div class="k" style="margin-top:10px"><span class="m"><b style="color:#16232a">Kolory:</b> czarny – sygnał RF · niebieski – sieć · czerwony – wejścia GPI · zielony – wyjścia GPO · żółty – zasilanie</span></div>""")
    kroki = ["Wyznacz rozstaw i przykręć podstawy", "Postaw słupy na podstawach", "Zamontuj 4 anteny (15° w stronę wejścia)", "Połącz słupy belką górną", "Przykręć czytnik do prawego słupa",
             "Ustaw skrzynkę sterującą", "Poprowadź kable antenowe do portów ANT1–4", "Zamontuj fotokomórki na wejściu", "Załóż lampę na belkę"]
    T["B2"] = strona("Kolejność montażu", "Złóż bramkę w AR w tej kolejności – numery części na liście odpowiadają krokom",
        f'<div class="g" style="grid-template-columns:780px 1fr;align-items:start"><img class="r" src="{img64("bramkaMontaz_1")}">'
        '<div class="k">' + "".join(f'<p style="font-size:23px;margin:9px 0;display:flex;align-items:center"><span class="nr" style="flex:none">{i + 1}</span>{t}</p>' for i, t in enumerate(kroki)) + '</div></div>')
    T["B3"] = strona("Ustawienie anten i strefa odczytu", "Widok z góry – jak pokryć przejście, żeby żaden karton nie został pominięty", """
<div class="g" style="grid-template-columns:820px 1fr;align-items:start"><div class="k"><svg viewBox="0 0 760 600" width="100%">
<rect x="90" y="40" width="580" height="520" fill="#fff8e1"/><text x="380" y="580" text-anchor="middle" font-size="20" fill="#8d6e00">kierunek ruchu ↓ (wejście u góry)</text>
<rect x="60" y="270" width="30" height="60" fill="#9aa4ad"/><rect x="670" y="270" width="30" height="60" fill="#9aa4ad"/>
<g transform="translate(110 300) rotate(-15)"><ellipse cx="190" cy="0" rx="190" ry="110" fill="#38d39f55" stroke="#38d39f" stroke-width="3"/><rect x="-8" y="-40" width="16" height="80" fill="#fff" stroke="#16232a" stroke-width="3"/></g>
<g transform="translate(650 300) rotate(15)"><ellipse cx="-190" cy="0" rx="190" ry="110" fill="#2bb3ff55" stroke="#2bb3ff" stroke-width="3"/><rect x="-8" y="-40" width="16" height="80" fill="#fff" stroke="#16232a" stroke-width="3"/></g>
<path d="M110 300 L300 300" stroke="#16232a" stroke-dasharray="6 6" stroke-width="2"/><path d="M110 300 L294 251" stroke="#e53935" stroke-width="3"/><text x="230" y="290" font-size="22" fill="#e53935">15°</text>
<path d="M90 380 H670" stroke="#16232a" stroke-width="2" marker-start="url(#s)" marker-end="url(#s)"/><text x="380" y="405" text-anchor="middle" font-size="22">rozstaw ok. 2 m</text>
<rect x="300" y="110" width="160" height="110" fill="#c49a64" stroke="#8a6a40" stroke-width="3"/><text x="380" y="172" text-anchor="middle" font-size="20" fill="#fff">paleta</text>
<defs><marker id="s" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#16232a"/></marker></defs></svg></div>
<div class="k"><h3>Zasady</h3><ul><li>Anteny po obu stronach – każdy karton „widzi” przynajmniej jedną.</li><li>Dwie wysokości (ok. 0,75 i 1,55 m) – pokrywają dół i górę palety.</li><li>Pochylenie ok. 15° w stronę wejścia – odczyt zaczyna się, zanim paleta wjedzie.</li><li>Polaryzacja kołowa – orientacja tagu nie ma znaczenia.</li><li>Za duża moc = odczyty z sąsiedniej bramki. Dobieraj moc, nie „na maksa”.</li><li>Kable równej długości, możliwie krótkie.</li></ul></div></div>""")
    lista = [("Zasilanie", "24 V podłączone, dioda czytnika świeci"), ("Anteny", "w panelu czytnika aktywne ANT1–ANT4, brak błędu VSWR"), ("Moc", "start od ok. 27 dBm, potem korekta"),
             ("Test pojedynczego tagu", "tag przy każdej antenie po kolei – odczyt na właściwym porcie"), ("Test palety", "40 kartonów – wszystkie EPC odczytane przy przejeździe"),
             ("Fotokomórki", "przerwanie wiązki uruchamia odczyt, kierunek poprawny"), ("Lampa", "zielona przy komplecie, czerwona przy braku"), ("Sąsiednia bramka", "tagi obok bramki NIE są odczytywane")]
    T["B4"] = strona("Uruchomienie – lista kontrolna", "Odhacz każdy punkt, zanim zgłosisz bramkę do odbioru",
        '<div class="g" style="grid-template-columns:1fr 1fr">' + "".join(f'<div class="k" style="display:flex;gap:18px;align-items:center"><span style="flex:none;width:44px;height:44px;border:4px solid #1e88e5;border-radius:10px"></span><div><h3 style="margin:0">{t}</h3><p class="m">{d}</p></div></div>' for t, d in lista) + '</div>')
    return T

# ---------------------------------------------------------------- kursy
def kursA():
    teksty = {
        "A – wstęp": "PRZEŚWIETLENIE TAGÓW\n\nPięć tagów RFID – każdy zbudowany inaczej, każdy działa na tej samej zasadzie: antena + chip.\n\nNa kolejnych slajdach rozłóż każdy tag na części i znajdź antenę oraz chip. Pomyśl, dlaczego anteny tak bardzo się różnią.",
        "A – karta HF": "KARTA HF 13,56 MHz\n\nRozłóż kartę. Policz zwoje cewki.\n\nPole magnetyczne czytnika indukuje w cewce napięcie – to jedyne zasilanie karty. Dlatego działa tylko z bliska (kilka cm).",
        "A – inlay UHF": "INLAY UHF (EPC Gen2)\n\nDipol λ/2 dla 868 MHz ma ok. 17 cm – tu zmieszczono go w 9,5 cm dzięki meandrom.\n\nTag nie nadaje – odbija falę czytnika, zmieniając impedancję anteny (backscatter). Zasięg: kilka metrów.",
        "A – kapsułka LF": "KAPSUŁKA LF 134,2 kHz\n\nSetki zwojów na rdzeniu ferrytowym w szklanej kapsułce 2 × 12 mm.\n\nNiska częstotliwość dobrze przenika tkanki – dlatego takie transpondery wszczepia się zwierzętom.",
        "A – tag na metal": "TAG UHF NA METAL\n\nRozłóż tag i znajdź przekładkę między anteną a masą.\n\nZwykła etykieta na metalu nie działa. Tu antena łatkowa jest odsunięta od metalu, a metal staje się jej „lustrem”.",
        "A – opaska": "OPASKA NFC\n\nTa sama technika co w karcie HF, tylko cewka ma ok. 2 cm średnicy.\n\nMniejsza cewka = mniejszy zasięg (2–4 cm). Silikon chroni chip przed wodą – stąd opaski na basenach i festiwalach.",
        "A – porównanie": "PORÓWNANIE\n\nZestaw wszystkie tagi obok siebie (plansza).\n\nNiższa częstotliwość: większa cewka, mniejszy zasięg, lepsza praca przy wodzie.\nWyższa: mała antena, duży zasięg, wrażliwość na metal i wodę.",
        "A – zadanie": "ZADANIE: DOBIERZ TAG\n\nDo każdej z 6 sytuacji na planszy wybierz tag i uzasadnij wybór (pasmo, zasięg, otoczenie).\n\nPotem rozwiąż quiz kursu – sprawdzi Twoje odpowiedzi.",
    }
    pliki, idx = [], {}
    def plik(nazwa, rodzaj, typ, src=None, tekst=None):
        idx[nazwa] = len(pliki); pliki.append({"nazwa": nazwa, "typ": typ, "rodzaj": rodzaj, **({"tekst": tekst} if tekst else {}), "src": src}); return idx[nazwa]
    for n, t in teksty.items(): plik(n + ".txt", "tekst", "text/plain", tekst=t)
    M = {"Karta HF – warstwy.glb": "kartaHF", "Inlay UHF.glb": "tagUHF", "Kapsułka LF.glb": "kapsulaLF", "Tag UHF na metal.glb": "tagNaMetal", "Opaska NFC.glb": "opaskaHF"}
    for n, f in M.items(): plik(n, "model", "model/gltf-binary", src=f"modele/rfid/{f}.glb")
    for n, k in [("Pięć tagów – plansza.jpg", "A1"), ("Dlaczego metal przeszkadza – plansza.jpg", "A2"), ("Porównanie tagów – plansza.jpg", "A3"), ("Dobierz tag – plansza.jpg", "A4")]: plik(n, "obraz", "image/jpeg", src="@" + k)
    WYM = {"kartaHF": 0.0856, "tagUHF": 0.099, "kapsulaLF": 0.012, "tagNaMetal": 0.128, "opaskaHF": 0.0745}
    def tekst(n): return {"rodzaj": "tekst", "plik": idx[n + ".txt"], "nazwa": n + ".txt", "poz": TP, "rotY": TR, "skala": 1.71, "tekst": teksty[n]}
    def obraz(n, lewa=True): return {"rodzaj": "obraz", "plik": idx[n], "nazwa": n, "poz": P1 if lewa else P2, "rotY": P1R if lewa else P2R, "skala": 38.2, "tekst": ""}
    def model(n, poz, cel, **f): return {"rodzaj": "model", "plik": idx[n], "nazwa": n, "poz": poz, "rotY": 0, "skala": round(cel / C, 3), "tekst": "", **f}
    roz = dict(uczen=True, rozklad=True, czesci=True)
    sl = [
        {"tytul": "Pięć tagów", "obiekty": [tekst("A – wstęp"), obraz("Pięć tagów – plansza.jpg")] + [model(n, [-0.2 + i * 0.42, 1.1, 1.6], 0.32, uczen=True, bezSkali=True) for i, n in enumerate(M)], "dymki": []},
        {"tytul": "Karta HF", "obiekty": [tekst("A – karta HF"), model("Karta HF – warstwy.glb", [0.5, 1.1, 1.6], 0.6, **roz)], "dymki": [{"cel": 1, "tekst": "Chip: UID, logika, modulator obciążenia", "lokal": [0.0257, 0.002, -0.0119]}, {"cel": 1, "tekst": "Antena – cewka (5 zwojów)", "lokal": [0.037, 0.001, 0.0216]}]},
        {"tytul": "Inlay UHF", "obiekty": [tekst("A – inlay UHF"), model("Inlay UHF.glb", [0.5, 1.2, 1.6], 0.7, **roz)], "dymki": [{"cel": 1, "tekst": "Chip EPC Gen2", "lokal": [0.0, 0.001, 0.0016]}, {"cel": 1, "tekst": "Dipol w meandrach", "lokal": [0.03, 0.0005, 0.008]}, {"cel": 1, "tekst": "Pętla dopasowująca T-match", "lokal": [0.0, 0.0005, 0.0045]}]},
        {"tytul": "Kapsułka LF", "obiekty": [tekst("A – kapsułka LF"), model("Kapsułka LF.glb", [0.5, 1.1, 1.6], 0.5, **roz)], "dymki": [{"cel": 1, "tekst": "Rdzeń ferrytowy z cewką", "lokal": [-0.002, 0.0008, 0]}, {"cel": 1, "tekst": "Chip + kondensator rezonansowy", "lokal": [0.004, 0.0008, 0]}]},
        {"tytul": "Tag na metal", "obiekty": [tekst("A – tag na metal"), obraz("Dlaczego metal przeszkadza – plansza.jpg"), model("Tag UHF na metal.glb", [0.5, 1.1, 1.6], 0.7, **roz)], "dymki": [{"cel": 2, "tekst": "Antena łatkowa", "lokal": [0.012, 0.0012, 0]}, {"cel": 2, "tekst": "Przekładka – dystans od metalu", "lokal": [0.035, 0, 0.012]}, {"cel": 2, "tekst": "Podłoże: stal", "lokal": [0.055, -0.0042, 0.022]}]},
        {"tytul": "Opaska NFC", "obiekty": [tekst("A – opaska"), model("Opaska NFC.glb", [0.5, 1.1, 1.6], 0.5, **roz)], "dymki": [{"cel": 1, "tekst": "W główce: cewka + chip NFC", "lokal": [0, 0.01, -0.037]}, {"cel": 1, "tekst": "Pasek silikonowy – wodoodporny", "lokal": [0.042, 0.008, 0]}]},
        {"tytul": "Porównanie", "obiekty": [tekst("A – porównanie"), obraz("Porównanie tagów – plansza.jpg"), obraz("Pięć tagów – plansza.jpg", False)], "dymki": []},
        {"tytul": "Zadanie: dobierz tag", "obiekty": [tekst("A – zadanie"), obraz("Dobierz tag – plansza.jpg")] + [model(n, [-0.2 + i * 0.42, 1.1, 1.6], 0.32, uczen=True, bezSkali=True) for i, n in enumerate(M)], "dymki": []},
    ]
    quiz = {"tytul": "Dobierz tag – sprawdź się", "opis": "Budowa tagów i dobór do zastosowania.", "instrukcje": "Jedna poprawna odpowiedź w każdym pytaniu.", "czas": 10, "pytania": [
        {"pytanie": "Paleta stalowych butli gazowych, odczyt z wózka z odległości ok. 3 m. Który tag?", "odpowiedzi": ["Kapsułka LF", "Karta HF", "Tag UHF na metal", "Zwykły inlay UHF"], "poprawna": 2},
        {"pytanie": "Karnet na basen do zamykania szafki. Który tag?", "odpowiedzi": ["Opaska NFC (HF)", "Inlay UHF", "Tag UHF na metal", "Kapsułka LF w szkle"], "poprawna": 0},
        {"pytanie": "Identyfikacja psa przez weterynarza. Który tag?", "odpowiedzi": ["Inlay UHF", "Kapsułka LF 134,2 kHz", "Karta HF", "Tag na metal"], "poprawna": 1},
        {"pytanie": "40 kartonów z odzieżą przejeżdża przez bramkę magazynową. Który tag?", "odpowiedzi": ["Karta HF", "Kapsułka LF", "Inlay UHF (etykieta)", "Opaska NFC"], "poprawna": 2},
        {"pytanie": "Po co w tagu na metal jest przekładka dielektryczna?", "odpowiedzi": ["Żeby tag był grubszy i łatwiej go chwycić", "Odsuwa antenę od metalu, który inaczej wygasiłby jej pole", "Chroni chip przed wodą", "Zwiększa pojemność pamięci"], "poprawna": 1},
        {"pytanie": "Dlaczego antena inlayu UHF ma kształt meandrów?", "odpowiedzi": ["Dla ozdoby", "Żeby zmieścić dipol λ/2 (ok. 17 cm) na krótszej etykiecie", "Żeby działała na 13,56 MHz", "Żeby zwiększyć liczbę zwojów cewki"], "poprawna": 1},
        {"pytanie": "Skąd karta HF bierze energię do pracy?", "odpowiedzi": ["Z baterii", "Z pola magnetycznego czytnika indukującego napięcie w cewce", "Ze światła", "Z ciepła dłoni"], "poprawna": 1},
        {"pytanie": "Opaska NFC ma mniejszy zasięg niż karta HF, bo…", "odpowiedzi": ["ma mniejszą cewkę (mniejszą powierzchnię anteny)", "działa na innej częstotliwości", "jest zrobiona z silikonu", "ma słabszy chip"], "poprawna": 0},
        {"pytanie": "Po co rdzeń ferrytowy w kapsułce LF?", "odpowiedzi": ["Jako bateria", "Skupia pole magnetyczne, zwiększając zasięg małej cewki", "Chroni przed korozją", "Mocuje kapsułkę w tkance"], "poprawna": 1},
        {"pytanie": "Etykieta UHF i tag UHF na metal mogą mieć ten sam chip. Czym się wtedy różnią?", "odpowiedzi": ["Częstotliwością", "Protokołem", "Anteną i konstrukcją", "Niczym"], "poprawna": 2},
    ]}
    kurs = {"tytul": "RFID – prześwietlenie tagów", "krotkiOpis": "Pięć tagów RFID od środka: karta HF, inlay UHF, kapsułka LF, tag na metal i opaska NFC. Rozłóż, porównaj i dobierz tag do zastosowania.",
            "przedmiot": "Laboratorium RFID", "czas": 30,
            "opisHtml": f"<p>Kurs przygotowujący do laboratorium RFID. Pięć modeli 3D do rozłożenia na warstwy z opisami części i dymkami, plansze porównawcze oraz zadanie „dobierz tag do zastosowania” zakończone quizem.</p><p>Uzupełnienie lekcji wprowadzającej: <a href=\"{LINK}\">{LINK}</a>.</p>",
            "czegoSieNauczysz": ["Wskazać antenę i chip w pięciu typach tagów", "Wyjaśnić, dlaczego anteny LF, HF i UHF wyglądają inaczej", "Wyjaśnić, dlaczego zwykły tag UHF nie działa na metalu", "Dobrać tag do zastosowania i uzasadnić wybór"]}
    return kurs, pliki, sl, quiz, ["A1", "A3"]

def kursB():
    teksty = {
        "B – wstęp": "MONTAŻ BRAMKI UHF\n\nZbudujesz bramkę magazynową: 2 słupy, 4 anteny, czytnik, fotokomórki i lampę.\n\nNajpierw poznaj części, potem złóż bramkę jak puzzle, na końcu sprawdź strefę odczytu. Schemat połączeń – na planszy.",
        "B – części": "POZNAJ CZĘŚCI\n\nRozłóż bramkę i otwórz listę części. Numery na liście = kolejność montażu.\n\nZwróć uwagę: każda antena ma osobny kabel do osobnego portu czytnika.",
        "B – puzzle": "ZŁÓŻ BRAMKĘ\n\nPrzeciągaj części na swoje miejsca w kolejności z planszy (1 → 9).\n\nAnteny muszą trafić dokładnie – ich ustawienie decyduje o strefie odczytu.",
        "B – strefa": "STREFA ODCZYTU\n\nCztery płaty anten nakładają się w środku bramki.\n\nObejdź model: anteny są pochylone o ok. 15° w stronę wejścia. Dlaczego? Co się stanie, gdy moc będzie za duża?",
        "B – uruchomienie": "URUCHOMIENIE\n\nPrzejdź listę kontrolną z planszy, zanim zgłosisz bramkę do odbioru.\n\nNa koniec rozwiąż quiz – sprawdza montaż i konfigurację.",
    }
    pliki, idx = [], {}
    def plik(nazwa, rodzaj, typ, src=None, tekst=None):
        idx[nazwa] = len(pliki); pliki.append({"nazwa": nazwa, "typ": typ, "rodzaj": rodzaj, **({"tekst": tekst} if tekst else {}), "src": src}); return idx[nazwa]
    for n, t in teksty.items(): plik(n + ".txt", "tekst", "text/plain", tekst=t)
    plik("Bramka UHF – montaż.glb", "model", "model/gltf-binary", src="modele/rfid/bramkaMontaz.glb")
    plik("Bramka UHF – strefa odczytu.glb", "model", "model/gltf-binary", src="modele/rfid/bramkaStrefa.glb")
    for n, k in [("Schemat połączeń – plansza.jpg", "B1"), ("Kolejność montażu – plansza.jpg", "B2"), ("Ustawienie anten – plansza.jpg", "B3"), ("Lista kontrolna – plansza.jpg", "B4")]: plik(n, "obraz", "image/jpeg", src="@" + k)
    def tekst(n): return {"rodzaj": "tekst", "plik": idx[n + ".txt"], "nazwa": n + ".txt", "poz": TP, "rotY": TR, "skala": 1.71, "tekst": teksty[n]}
    def obraz(n, lewa=True): return {"rodzaj": "obraz", "plik": idx[n], "nazwa": n, "poz": P1 if lewa else P2, "rotY": P1R if lewa else P2R, "skala": 38.2, "tekst": ""}
    BM, BS = "Bramka UHF – montaż.glb", "Bramka UHF – strefa odczytu.glb"
    def bramka(n, cel=1.6, **f): h = cel * 2.415 / 2.592; return {"rodzaj": "model", "plik": idx[n], "nazwa": n, "poz": [0.5, round(h / 2, 3), 1.9], "rotY": 0, "skala": round(cel / C, 3), "tekst": "", **f}
    sl = [
        {"tytul": "Co zbudujesz", "obiekty": [tekst("B – wstęp"), obraz("Schemat połączeń – plansza.jpg"), bramka(BM, uczen=True, bezSkali=True)], "dymki": []},
        {"tytul": "Poznaj części", "obiekty": [tekst("B – części"), obraz("Kolejność montażu – plansza.jpg"), bramka(BM, uczen=True, rozklad=True, czesci=True)],
         "dymki": [{"cel": 2, "tekst": "Antena panelowa UHF (×4)", "lokal": [-0.9, 0.9, 0.05]}, {"cel": 2, "tekst": "Czytnik – 4 porty antenowe", "lokal": [1.2, 1.35, 0]}, {"cel": 2, "tekst": "Fotokomórka – wyzwala odczyt", "lokal": [-0.93, 0.55, 0.37]}, {"cel": 2, "tekst": "Lampa: zielona / czerwona", "lokal": [0, 2.32, 0]}]},
        {"tytul": "Złóż bramkę", "obiekty": [tekst("B – puzzle"), obraz("Kolejność montażu – plansza.jpg"), bramka(BM, uczen=True, puzzle=True, czesci=True, precyzja=0.3)], "dymki": []},
        {"tytul": "Strefa odczytu", "obiekty": [tekst("B – strefa"), obraz("Ustawienie anten – plansza.jpg"), bramka(BS, uczen=True, bezSkali=True)], "dymki": []},
        {"tytul": "Uruchomienie", "obiekty": [tekst("B – uruchomienie"), obraz("Lista kontrolna – plansza.jpg"), obraz("Schemat połączeń – plansza.jpg", False)], "dymki": []},
    ]
    quiz = {"tytul": "Montaż bramki UHF – sprawdź się", "opis": "Elementy bramki, połączenia, ustawienie anten i uruchomienie.", "instrukcje": "Jedna poprawna odpowiedź w każdym pytaniu.", "czas": 10, "pytania": [
        {"pytanie": "Ile portów antenowych czytnika zajmuje bramka z tego kursu?", "odpowiedzi": ["1", "2", "4", "8"], "poprawna": 2},
        {"pytanie": "Co montujesz najpierw?", "odpowiedzi": ["Lampę", "Podstawy słupów", "Kable antenowe", "Anteny"], "poprawna": 1},
        {"pytanie": "Po co anteny są pochylone o ok. 15° w stronę wejścia?", "odpowiedzi": ["Żeby lepiej wyglądały", "Odczyt zaczyna się, zanim paleta wjedzie w bramkę", "Żeby kable były krótsze", "Żeby nie przeszkadzały wózkowi"], "poprawna": 1},
        {"pytanie": "Dlaczego anteny są na dwóch wysokościach?", "odpowiedzi": ["Pokrywają dół i górę palety", "Jedna jest zapasowa", "Dla symetrii konstrukcji", "Żeby zmniejszyć moc"], "poprawna": 0},
        {"pytanie": "Do czego służy fotokomórka na wejściu?", "odpowiedzi": ["Oświetla przejście", "Wyzwala odczyt i pozwala ustalić kierunek ruchu", "Mierzy temperaturę", "Zasila czytnik"], "poprawna": 1},
        {"pytanie": "Dlaczego kable antenowe powinny być możliwie krótkie?", "odpowiedzi": ["Każdy metr kabla tłumi sygnał", "Krótsze są tańsze, poza tym bez znaczenia", "Żeby nie było ich widać", "Bo czytnik ma mało portów"], "poprawna": 0},
        {"pytanie": "Bramka odczytuje tagi z palety stojącej obok, przy sąsiedniej bramce. Co robisz najpierw?", "odpowiedzi": ["Zwiększam moc", "Zmniejszam moc nadawania i sprawdzam ustawienie anten", "Wymieniam tagi", "Dokładam piątą antenę"], "poprawna": 1},
        {"pytanie": "Dlaczego stosuje się anteny o polaryzacji kołowej?", "odpowiedzi": ["Są mniejsze", "Tag odczyta się niezależnie od tego, jak jest obrócony", "Mają większą moc", "Działają na HF"], "poprawna": 1},
        {"pytanie": "Którym wyjściem czytnika sterujesz lampą sygnalizacyjną?", "odpowiedzi": ["Portem antenowym", "Wyjściem GPO", "Wejściem GPI", "Złączem zasilania"], "poprawna": 1},
        {"pytanie": "Jak sprawdzisz, czy każda antena działa?", "odpowiedzi": ["Patrząc na lampę", "Przykładając tag do każdej anteny po kolei i sprawdzając numer portu odczytu", "Mierząc długość kabli", "Nie da się tego sprawdzić"], "poprawna": 1},
    ]}
    kurs = {"tytul": "RFID – montaż bramki UHF", "krotkiOpis": "Złóż w AR bramkę magazynową UHF: słupy, cztery anteny, czytnik, fotokomórki i lampa. Poznaj części, ułóż je jak puzzle i sprawdź strefę odczytu.",
            "przedmiot": "Laboratorium RFID", "czas": 35,
            "opisHtml": f"<p>Przygotowanie do budowy bramki w laboratorium RFID. Model bramki do rozłożenia z opisem każdej części, tryb układanki (złóż bramkę w kolejności montażu), model ze strefą odczytu anten, schemat połączeń i lista kontrolna uruchomienia. Na końcu quiz.</p><p>Symulacje bramki i antykolizji: <a href=\"{LINK}\">{LINK}</a>.</p>",
            "czegoSieNauczysz": ["Wymienić elementy bramki UHF i ich rolę", "Złożyć bramkę we właściwej kolejności", "Połączyć anteny, czytnik, fotokomórki i lampę", "Wyjaśnić dobór ustawienia anten i mocy", "Uruchomić i przetestować bramkę według listy kontrolnej"]}
    return kurs, pliki, sl, quiz, ["B1", "B3"]

async def main():
    os.makedirs(OUT, exist_ok=True)
    T = plansze(); jpg = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1243/chrome-linux64/chrome")
        pg = await b.new_page(viewport={"width": 1600, "height": 1000})
        for k, html in T.items():
            await pg.set_content(html); await pg.wait_for_timeout(200)
            jpg[k] = await pg.screenshot(type="jpeg", quality=86); open(f"{OUT}/{k}.jpg", "wb").write(jpg[k])
        await b.close()
    for nazwaZip, (kurs, pliki, sl, quiz, gal) in [("kurs-prześwietlenie-tagów-e-peAR.zip", kursA()), ("kurs-montaż-bramki-e-peAR.zip", kursB())]:
        z = zipfile.ZipFile(f"{OUT}/{nazwaZip}", "w", zipfile.ZIP_DEFLATED)
        for i, f in enumerate(pliki):
            src = f.pop("src"); nz = f"p{i}-{f['nazwa']}"; f["plik"] = nz
            dane = f["tekst"].encode() if f["rodzaj"] == "tekst" else jpg[src[1:]] if src.startswith("@") else open(f"{REPO}/{src}", "rb").read()
            z.writestr("pliki/" + nz, dane)
        galeria = []
        for i, k in enumerate(gal):
            n = f"g{i}-{k}.jpg"; z.writestr("pliki/" + n, jpg[k]); galeria.append({"nazwa": n.split("-", 1)[1], "typ": "image/jpeg", "plik": n})
        P = {"wersja": 2, "kurs": kurs, "sceny": [s["tytul"] for s in sl], "scena": {"slajdy": sl}, "pominiete": [], "pliki": pliki, "galeria": galeria, "quiz": quiz}
        z.writestr("paczka.json", json.dumps(P, ensure_ascii=False)); z.close()
        print(nazwaZip, os.path.getsize(f"{OUT}/{nazwaZip}") // 1024, "KB,", len(sl), "slajdów,", len(pliki), "plików")

asyncio.run(main())
