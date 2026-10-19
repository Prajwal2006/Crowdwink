export const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

export function isValidCode(code: string) {
  return CODE_PATTERN.test(code);
}

export function inviteUrl(code: string) {
  const base =
    typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? "");
  return `${base}/r/${code}`;
}
