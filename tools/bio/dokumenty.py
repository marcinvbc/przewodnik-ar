"""Pliki do lekcji: arkusz pomiarów tętna (xlsx) i karta pracy (docx)."""
import sys, os
from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from docx import Document
from docx.shared import Pt, Cm, RGBColor

DANE = [("Uczeń 1", 72, 118, 80), ("Uczeń 2", 80, 126, 86), ("Uczeń 3", 68, 110, 74), ("Uczeń 4", 76, 124, 82),
        ("Uczeń 5", 84, 132, 90), ("Uczeń 6", 70, 115, 76), ("Uczeń 7", 78, 121, 84), ("Uczeń 8", 74, 119, 79)]

def xlsx(path):
    wb = Workbook(); ws = wb.active; ws.title = "Pomiary tętna"
    ws["A1"] = "Wpływ wysiłku fizycznego na tętno (uderzenia na minutę)"; ws["A1"].font = Font(bold=True, size=14)
    ws["A2"] = "Przykładowe dane – wpiszcie w kolumnach B–D własne pomiary. Średnie policzą się same."; ws["A2"].font = Font(italic=True, color="666666")
    hdr = ["Osoba", "W spoczynku", "Po 20 przysiadach", "Po 3 min odpoczynku", "Wzrost po wysiłku"]
    fill = PatternFill("solid", fgColor="C8372D"); thin = Side(style="thin", color="CCCCCC")
    for i, h in enumerate(hdr, 1):
        c = ws.cell(4, i, h); c.font = Font(bold=True, color="FFFFFF"); c.fill = fill; c.alignment = Alignment(horizontal="center", wrap_text=True)
    for r, row in enumerate(DANE, 5):
        for i, v in enumerate(row, 1): ws.cell(r, i, v).border = Border(bottom=thin)
        ws.cell(r, 5, f"=C{r}-B{r}")
    last = 4 + len(DANE); s = last + 1
    ws.cell(s, 1, "Średnia klasy").font = Font(bold=True)
    for col in "BCDE":
        c = ws[f"{col}{s}"]; c.value = f"=ROUND(AVERAGE({col}5:{col}{last}),1)"; c.font = Font(bold=True)
    for col, w in zip("ABCDE", (16, 14, 18, 20, 18)): ws.column_dimensions[col].width = w
    ws.row_dimensions[4].height = 32
    ch = BarChart(); ch.title = "Tętno przed i po wysiłku"; ch.y_axis.title = "uderzenia / min"; ch.height = 8; ch.width = 18
    ch.add_data(Reference(ws, min_col=2, max_col=4, min_row=4, max_row=last), titles_from_data=True)
    ch.set_categories(Reference(ws, min_col=1, min_row=5, max_row=last))
    ws.add_chart(ch, "G4")
    wb.save(path)

def docx(path):
    d = Document()
    st = d.styles["Normal"]; st.font.name = "Calibri"; st.font.size = Pt(12)
    for s in d.sections: s.left_margin = s.right_margin = Cm(2); s.top_margin = s.bottom_margin = Cm(1.6)
    h = d.add_heading("Karta pracy: Serce i krążenie krwi", 0)
    d.add_paragraph("Imię i nazwisko: ……………………………………   Klasa: ………   Data: ……………")
    d.add_heading("1. Podpisz elementy serca", 2)
    d.add_paragraph("Na rysunku (ilustracja „Budowa serca – bez podpisów”) wpisz: prawy przedsionek, lewy przedsionek, prawa komora, lewa komora, aorta, pień płucny, żyła główna górna, zastawka dwudzielna.")
    d.add_heading("2. Uzupełnij drogę krwi", 2)
    d.add_paragraph("Krwiobieg mały: prawa komora → ……………………… → płuca → ……………………… → lewy przedsionek")
    d.add_paragraph("Krwiobieg duży: lewa komora → ……………………… → narządy ciała → ……………………… → prawy przedsionek")
    d.add_heading("3. Tętnica czy żyła?", 2)
    t = d.add_table(rows=1, cols=3); t.style = "Light Grid Accent 2"
    for c, x in zip(t.rows[0].cells, ("Cecha", "Tętnica", "Żyła")): c.text = x
    for cecha in ("grubość ściany", "kierunek przepływu krwi (od serca / do serca)", "zastawki (są / brak)", "ciśnienie krwi (wysokie / niskie)"):
        r = t.add_row().cells; r[0].text = cecha
    d.add_heading("4. Doświadczenie: wpływ wysiłku na tętno", 2)
    d.add_paragraph("Problem badawczy: Jak wysiłek fizyczny wpływa na częstość skurczów serca?")
    d.add_paragraph("Hipoteza: ………………………………………………………………………………………")
    d.add_paragraph("Zmierz tętno na tętnicy promieniowej (nadgarstek) przez 15 s i pomnóż wynik przez 4. "
                    "Pomiar wykonaj w spoczynku, zaraz po 20 przysiadach i po 3 minutach odpoczynku. Osoby zwolnione z ćwiczeń są obserwatorami i zapisują wyniki.")
    t = d.add_table(rows=2, cols=3); t.style = "Light Grid Accent 2"
    for c, x in zip(t.rows[0].cells, ("W spoczynku", "Po 20 przysiadach", "Po 3 min odpoczynku")): c.text = x
    d.add_paragraph("Wniosek: ………………………………………………………………………………………")
    d.add_heading("5. Zdrowe serce", 2)
    d.add_paragraph("Wypisz trzy zachowania, które chronią serce przed chorobami (np. miażdżycą, nadciśnieniem, zawałem):")
    for _ in range(3): d.add_paragraph("……………………………………………………………………", style="List Number")
    d.add_heading("NaCoBeZu – sprawdź się", 2)
    for x in ("Potrafię wskazać przedsionki, komory, zastawki i główne naczynia.", "Umiem opisać krwiobieg mały i duży.",
              "Wiem, czym różnią się tętnice, żyły i naczynia włosowate.", "Potrafię zmierzyć tętno i wyjaśnić, dlaczego rośnie po wysiłku."):
        d.add_paragraph("☐ " + x)
    d.save(path)

if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    xlsx(os.path.join(out, "pomiary-tetna.xlsx")); docx(os.path.join(out, "karta-pracy-serce.docx")); print("ok")
