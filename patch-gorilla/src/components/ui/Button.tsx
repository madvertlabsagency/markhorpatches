import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonStyles = cva(
  "group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-display font-extrabold uppercase tracking-[0.06em] transition-[transform,box-shadow,background-color,color,border-color] duration-300 ease-[var(--ease-brand)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-signature text-white shadow-glow hover:shadow-[0_14px_44px_-10px_rgb(8_216_216/.6)] hover:-translate-y-0.5",
        dark: "bg-navy text-white hover:bg-patch hover:-translate-y-0.5 shadow-lift",
        light: "bg-white text-navy hover:-translate-y-0.5 shadow-lift",
        outline: "border-2 border-navy/15 bg-white/60 text-navy backdrop-blur hover:border-navy hover:bg-white",
        "outline-light": "border-2 border-white/25 bg-white/5 text-white backdrop-blur hover:border-turquoise hover:bg-white/10",
        ghost: "text-navy hover:bg-navy/5",
        "ghost-light": "text-white hover:bg-white/10",
        danger: "bg-danger text-white hover:bg-danger/90",
      },
      size: {
        sm: "h-10 px-4 text-[0.95rem]",
        md: "h-12 px-6 text-lg",
        lg: "h-14 px-8 text-xl",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Common = VariantProps<typeof buttonStyles> & { className?: string; arrow?: boolean; children: React.ReactNode };

export function Button({ variant, size, className, arrow, children, ...props }: Common & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(buttonStyles({ variant, size }), className)} {...props}>
      {children}
      {arrow && <ArrowRight aria-hidden className="h-[1.1em] w-[1.1em] transition-transform duration-300 group-hover/btn:translate-x-1" />}
    </button>
  );
}

export function ButtonLink({ variant, size, className, arrow, children, href, ...props }: Common & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={cn(buttonStyles({ variant, size }), className)} {...props}>
      {children}
      {arrow && <ArrowRight aria-hidden className="h-[1.1em] w-[1.1em] transition-transform duration-300 group-hover/btn:translate-x-1" />}
    </Link>
  );
}
