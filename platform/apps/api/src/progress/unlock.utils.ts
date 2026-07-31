export function levelUnlockThreshold(levelCode: string) {
  return levelCode.toUpperCase() === "A0" ? 1 : 0.8;
}

export function canUnlockLevel(levelCode: string, completed: number, total: number) {
  return total > 0 && completed / total >= levelUnlockThreshold(levelCode);
}
