/** A moment as its local calendar day, YYYY-MM-DD: the format the stores keep. */
export function dataLokalna(d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
