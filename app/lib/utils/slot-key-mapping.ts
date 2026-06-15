export function toBrandBookKey(slotKey: string): string {
  return slotKey.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
