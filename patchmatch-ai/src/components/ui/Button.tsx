import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 ease-[var(--ease-brand)] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-px",
  {
    variants: {
      variant: {
        primary: "bg-electric text-[var(--pm-primary-fg)] shadow-[0_8px_24px_-12px_rgb(241_90_36/0.75)] hover:bg-[#B93C0A] dark:hover:bg-[#FF8A5B] hover:shadow-[var(--shadow-glow)]",
        dark: "bg-navy text-white hover:bg-deep dark:bg-white dark:text-navy dark:hover:bg-offwhite",
        secondary: "border border-line bg-surface text-fg hover:border-electric/50 hover:bg-surface-2",
        ghost: "text-fg hover:bg-surface-2",
        outlineLight: "border border-white/25 bg-white/5 text-white backdrop-blur hover:bg-white/10",
        danger: "bg-danger text-white hover:bg-[#b91c1c]",
        success: "bg-success text-white hover:bg-[#17573C]",
        link: "h-auto px-0 text-electric underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-13 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Variants = VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, loading, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & Variants & { loading?: boolean }) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} disabled={loading || props.disabled} aria-busy={loading || undefined} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ className, variant, size, href, children, ...props }: React.ComponentProps<typeof Link> & Variants) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </Link>
  );
}
