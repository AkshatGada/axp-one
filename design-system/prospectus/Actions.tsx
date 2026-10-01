// Prospectus actions: one square ink primary with a wide arrow gap, and an underlined text action.
import type { ReactNode } from "react";

/** A long, thin arrow: the only arrow on the page. */
export function Arrow({ width = 26 }: { width?: number }) {
  return (
    <svg className="px-arrow" width={width} height={12} viewBox={`0 0 ${width} 12`} fill="none" aria-hidden>
      <path d={`M0 6h${width - 1}M${width - 7} 1l6 5-6 5`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

type ActionProps = {
  href: string;
  children: ReactNode;
  size?: "m" | "s";
  variant?: "ink" | "outline";
  external?: boolean;
  className?: string;
};

export function ActionPrimary({ href, children, size = "m", variant = "ink", external, className }: ActionProps) {
  return (
    <a
      href={href}
      className={`px-action${className ? ` ${className}` : ""}`}
      data-size={size === "s" ? "s" : undefined}
      data-variant={variant === "outline" ? "outline" : undefined}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <span>{children}</span>
      <Arrow width={size === "s" ? 20 : 26} />
    </a>
  );
}

export function ActionText({ href, children, external, className }: Omit<ActionProps, "size" | "variant">) {
  return (
    <a href={href} className={`px-textaction${className ? ` ${className}` : ""}`} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      <span>{children}</span>
      <Arrow width={18} />
    </a>
  );
}

export function Actions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`px-actions${className ? ` ${className}` : ""}`}>{children}</div>;
}
