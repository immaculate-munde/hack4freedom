"""
Build the synthetic M-Pesa statement PDF.

The password is a demo string, not a national ID. Real statement passwords
are whatever the user types. This script only exists so the fixture can be
regenerated. Do not put a real statement through it.
"""

from pathlib import Path

from fpdf import FPDF
from pypdf import PdfReader, PdfWriter

PASSWORD = "demo-statement"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "fixtures" / "statements" / "amina-statement.pdf"

ROWS = [
    "QA10AA01  2026-04-02 08:12  Pay Bill to 888001 - GREENVIEW APARTMENTS Acc. RENT  Completed  Withdrawn 15000.00  Balance 7400.00",
    "QA10AA07  2026-04-28 08:05  Customer Transfer from 254700000301 - ACME DIGITAL LTD  Completed  Paid in 45000.00  Balance 46790.00",
    "QA10AA08  2026-05-02 08:04  Pay Bill to 888001 - GREENVIEW APARTMENTS Acc. RENT  Completed  Withdrawn 15000.00  Balance 31768.00",
    "QA10AA13  2026-05-28 08:11  Customer Transfer from 254700000301 - ACME DIGITAL LTD  Completed  Paid in 42000.00  Balance 63028.00",
    "QA10AA14  2026-06-02 08:09  Pay Bill to 888001 - GREENVIEW APARTMENTS Acc. RENT  Completed  Withdrawn 15000.00  Balance 48006.00",
    "QA10AA15  2026-06-06 14:17  Fuliza M-PESA used. Outstanding Fuliza M-PESA balance 500.00  Completed",
    "QA10AA17  2026-06-28 08:02  Customer Transfer from 254700000301 - ACME DIGITAL LTD  Completed  Paid in 40000.00  Balance 52400.00",
    "QA10AA18  2026-07-02 08:15  Pay Bill to 888001 - GREENVIEW APARTMENTS Acc. RENT  Completed  Withdrawn 15000.00  Balance 37378.00",
    "QA10AA20  2026-07-28 08:07  Customer Transfer from 254700000301 - ACME DIGITAL LTD  Completed  Paid in 48000.00  Balance 61200.00",
    "QA10AA21  2026-08-02 08:01  Pay Bill to 888001 - GREENVIEW APARTMENTS Acc. RENT  Completed  Withdrawn 15000.00  Balance 46178.00",
    "QA99RV01  2026-08-19 08:01  Reversal of transaction QA10AA06  Completed  Balance 2640.00",
    "QA10AA23  2026-08-28 08:06  Customer Transfer from 254700000301 - ACME DIGITAL LTD  Completed  Paid in 45000.00  Balance 58100.00",
    "QA10AA24  2026-09-02 08:10  Pay Bill to 888001 - GREENVIEW APARTMENTS Acc. RENT  Completed  Withdrawn 15000.00  Balance 43078.00",
    "QA10AA26  2026-09-28 08:04  Customer Transfer from 254700000301 - ACME DIGITAL LTD  Completed  Paid in 45000.00  Balance 62450.00",
]


def build_plain(path: Path) -> None:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=11)
    pdf.multi_cell(0, 6, "M-PESA STATEMENT (synthetic)")
    pdf.ln(1)
    pdf.set_font("Helvetica", size=9)
    pdf.multi_cell(
        0,
        5,
        "Customer: Amina Wanjiku (invented)\n"
        "Phone: 254700000101\n"
        "Period: 01 Apr 2026 to 30 Sep 2026\n"
        "This is not a real person and not a real statement.",
    )
    pdf.ln(2)
    pdf.set_font("Helvetica", size=7)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, 4, "Receipt  Completion time  Details  Status  Paid in  Withdrawn  Balance")
    pdf.ln(1)
    for row in ROWS:
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(pdf.epw, 4, row)
    pdf.output(path)


def encrypt(plain: Path, encrypted: Path) -> None:
    reader = PdfReader(str(plain))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(user_password=PASSWORD, owner_password=PASSWORD, algorithm="AES-256")
    with encrypted.open("wb") as handle:
        writer.write(handle)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    plain = OUT.with_suffix(".plain.pdf")
    build_plain(plain)
    encrypt(plain, OUT)
    plain.unlink()

    raw = OUT.read_bytes()
    if b"GREENVIEW" in raw:
        raise SystemExit("Statement text leaked into the encrypted file.")
    check = PdfReader(str(OUT))
    if not check.is_encrypted:
        raise SystemExit("PDF was not encrypted.")
    if check.decrypt(PASSWORD) == 0:
        raise SystemExit("Demo password did not open the PDF.")
    text = check.pages[0].extract_text() or ""
    if "GREENVIEW" not in text or "Pay Bill" not in text:
        raise SystemExit("Decrypted text is missing the statement rows.")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
