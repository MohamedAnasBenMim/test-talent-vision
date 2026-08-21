import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/20 bg-primary/10 text-primary shadow-2xs hover:bg-primary/20",
        secondary:
          "border-secondary bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive shadow-2xs hover:bg-destructive/20",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20",
        warning:
          "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
        info:
          "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20",
        outline: "border-border bg-background text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
