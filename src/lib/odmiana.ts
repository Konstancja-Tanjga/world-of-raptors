/** "1 gatunek", "2 gatunki", "5 gatunków": Polish plural forms for a count. */
export function odmiana(n: number, [jeden, kilka, wiele]: [string, string, string]) {
  if (n === 1) return jeden;
  const d = n % 10;
  const s = n % 100;
  return d >= 2 && d <= 4 && (s < 12 || s > 14) ? kilka : wiele;
}
