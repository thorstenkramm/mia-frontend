import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
// DESIGN native semantic table primitive. Overflow is keyboard named only when real.
export function useContainedOverflow<T extends HTMLElement>(
  children: ReactNode,
) {
  const region = useRef<T>(null);
  const [overflow, setOverflow] = useState(false);
  useLayoutEffect(() => {
    const node = region.current;
    if (node === null) return;
    const measure = () => setOverflow(node.scrollWidth > node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children]);
  return { region, overflow };
}
export function MarkdownTable({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const { region, overflow } = useContainedOverflow<HTMLDivElement>(children);
  return (
    <div
      ref={region}
      className="max-w-full overflow-x-auto"
      role={overflow ? "region" : undefined}
      aria-label={overflow ? label : undefined}
      tabIndex={overflow ? 0 : undefined}
    >
      <table>
        <caption>{label}</caption>
        {children}
      </table>
    </div>
  );
}
