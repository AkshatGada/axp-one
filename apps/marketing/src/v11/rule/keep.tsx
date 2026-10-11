// The approved words, character for character, with each hyphenated word kept on one line.
import type { ReactNode } from "react";

export function keep(text: string): ReactNode {
  return text.split(/(\S+-\S+)/).map((part, n) => (n % 2 ? <span key={n} style={{ whiteSpace: "nowrap" }}>{part}</span> : part));
}
