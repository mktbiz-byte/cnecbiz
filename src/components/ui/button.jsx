import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-orange-500 text-white shadow-md hover:bg-orange-600 hover:shadow-lg active:shadow-sm",
        destructive:
          "bg-red-500 text-white shadow-md hover:bg-red-600 hover:shadow-lg focus-visible:ring-red-200",
        outline:
          "border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:shadow-md",
        secondary:
          "bg-gray-100 text-gray-700 shadow-sm hover:bg-gray-200 hover:shadow-md",
        ghost:
          "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
        link: "text-orange-500 underline-offset-4 hover:underline hover:text-orange-600",
        success:
          "bg-green-500 text-white shadow-md hover:bg-green-600 hover:shadow-lg",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-9 rounded-lg gap-1.5 px-4 has-[>svg]:px-3 text-xs",
        lg: "h-12 rounded-xl px-8 has-[>svg]:px-6 text-base",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }
