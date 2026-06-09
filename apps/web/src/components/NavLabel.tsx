import type { ReactNode } from "react";
import { IconArrow } from "./IconArrow";

type Props = {
  direction: "left" | "right";
  children: ReactNode;
};

export function NavLabel({ direction, children }: Props) {
  return (
    <span className={`nav-label nav-label-${direction}`}>
      {direction === "left" && <IconArrow direction="left" />}
      <span>{children}</span>
      {direction === "right" && <IconArrow direction="right" />}
    </span>
  );
}
