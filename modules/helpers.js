export function randomHex(length) {
  const chars = "0123456789abcdef";
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

