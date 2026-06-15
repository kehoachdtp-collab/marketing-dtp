const FORBIDDEN_PASSWORDS = ["123456", "password", "admin", "Admin123"];

export function validatePassword(password: string) {
  const errors: string[] = [];
  if (password.length < 8) errors.push("M?t kh?u t?i thi?u 8 k? t?.");
  if (!/[A-Z]/.test(password)) errors.push("M?t kh?u c?n c? ch? hoa.");
  if (!/[a-z]/.test(password)) errors.push("M?t kh?u c?n c? ch? th??ng.");
  if (!/[0-9]/.test(password)) errors.push("M?t kh?u c?n c? s?.");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("M?t kh?u c?n c? k? t? ??c bi?t.");
  if (FORBIDDEN_PASSWORDS.some((p) => p.toLowerCase() === password.toLowerCase())) {
    errors.push("Kh?ng ???c d?ng m?t kh?u m?c ??nh ho?c qu? d? ?o?n.");
  }
  return errors;
}
