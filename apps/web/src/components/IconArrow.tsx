type Props = {
  direction: "left" | "right";
  className?: string;
};

export function IconArrow({ direction, className = "" }: Props) {
  return (
    <svg
      className={`icon-arrow icon-arrow-${direction}${className ? ` ${className}` : ""}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "left" ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 6l6 6-6 6" />
      )}
    </svg>
  );
}
