/** true en celulares/tablets: cambia textos de teclado por indicaciones táctiles. */
export const TOUCH = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

/** Saca las teclas entre paréntesis de un texto ("JUGAR (ENTER)" → "JUGAR") en pantallas táctiles. */
export function keyless(text: string): string {
  return TOUCH ? text.replace(/\s*\((?:ENTER|ESC|R|C|T|L|F|E|S)\)/g, "") : text;
}
