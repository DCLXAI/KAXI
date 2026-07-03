export function isEnvTrue(value: string | undefined | null): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function isEnvFalse(value: string | undefined | null): boolean {
  return value?.trim().toLowerCase() === "false";
}
