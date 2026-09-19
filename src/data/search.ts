/** Case-insensitive name match, or phone match on digits only. `query` must be lower-case. */
export function matchesNameOrPhone(entity: { name: string; phone: string }, query: string): boolean {
  const digits = query.replace(/\D/g, "");
  return entity.name.toLowerCase().includes(query) || (digits !== "" && entity.phone.replace(/\D/g, "").includes(digits));
}
