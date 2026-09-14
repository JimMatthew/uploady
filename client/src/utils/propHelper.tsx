

export function propIfPresent<K extends string, V>(
  key: K,
  value: V | null | undefined,
): {} | { [P in K]: V } {
  return value == null
    ? {}
    : ({ [key]: value } as { [P in K]: V });
}