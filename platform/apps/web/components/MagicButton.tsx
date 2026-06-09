import Link from "next/link";

type MagicButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "dark" | "light";
};

export function MagicButton({
  href,
  children,
  variant = "dark"
}: MagicButtonProps) {
  return (
    <Link className={`magic-button ${variant}`} href={href}>
      {children}
    </Link>
  );
}
