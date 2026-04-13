/** Integer 0 .. 999_999_999_999 — short-scale English (thousand / million / billion), not lakh/crore. */
const ones = [
    '',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function wordsUnder100(n: number): string {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o ? `${tens[t]} ${ones[o]}` : tens[t];
}

function wordsUnder1000(n: number): string {
    if (n < 100) return wordsUnder100(n);
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const head = `${ones[h]} hundred`;
    return rest ? `${head} ${wordsUnder100(rest)}` : head;
}

function integerToWords(n: number): string {
    if (!Number.isFinite(n) || n < 0) return 'zero';
    if (n === 0) return 'zero';
    if (n < 1000) return wordsUnder1000(n);

    const billion = Math.floor(n / 1_000_000_000);
    const afterB = n % 1_000_000_000;
    const million = Math.floor(afterB / 1_000_000);
    const afterM = afterB % 1_000_000;
    const thousand = Math.floor(afterM / 1_000);
    const hundreds = afterM % 1_000;

    const parts: string[] = [];
    if (billion > 0) parts.push(`${wordsUnder1000(billion)} billion`);
    if (million > 0) parts.push(`${wordsUnder1000(million)} million`);
    if (thousand > 0) parts.push(`${wordsUnder1000(thousand)} thousand`);
    if (hundreds > 0) parts.push(wordsUnder1000(hundreds));
    return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** e.g. "RUPEES TWO HUNDRED FIFTY ONLY" — amounts typical for journal vouchers. */
export function rupeesAmountToWords(amount: number): string {
    const rounded = Math.round(amount * 100) / 100;
    const rupees = Math.floor(rounded + 1e-9);
    const paisa = Math.round((rounded - rupees) * 100);
    let core = integerToWords(rupees);
    if (paisa > 0) {
        core += ` and ${integerToWords(paisa)} paisa`;
    }
    return `RUPEES ${core.toUpperCase()} ONLY`;
}

/** Pakistan FY July–June: e.g. Mar 2026 → 2025-2026 */
export function financialYearLabelUtc(d: Date): string {
    const y = d.getFullYear();
    const m = d.getMonth();
    const fyStart = m >= 6 ? y : y - 1;
    return `${fyStart}-${fyStart + 1}`;
}
