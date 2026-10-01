// Prospectus type primitives: word-masked headlines and the display scale.
import { Fragment, createElement, type CSSProperties, type ReactNode } from "react";

/** A line of text split into word masks. Each word rises from its own mask when its
 *  [data-reveal] ancestor gets data-in (armed by the app's MotionRoot). Still otherwise. */
export function Words({ text, start = 0 }: { text: string; start?: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, n) => (
        <Fragment key={`${w}-${n}`}>
          <span className="px-w">
            <span className="px-wi" style={{ "--i": start + n } as CSSProperties}>
              {w}
            </span>
          </span>
          {n < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

export type DisplaySize = "dxxl" | "dxl" | "h1" | "h2" | "h3";

/** A heading on the Prospectus scale. String children are word-masked and revealed on scroll. */
export function Display({
  as = "h2",
  size = "h2",
  children,
  id,
  className,
  reveal = true,
  style,
}: {
  as?: "h1" | "h2" | "h3" | "p" | "div";
  size?: DisplaySize;
  children: ReactNode;
  id?: string;
  className?: string;
  reveal?: boolean;
  style?: CSSProperties;
}) {
  const content = typeof children === "string" ? <Words text={children} /> : children;
  return createElement(
    as,
    { id, className: `px-${size}${className ? ` ${className}` : ""}`, "data-reveal": reveal ? "" : undefined, style },
    content,
  );
}
