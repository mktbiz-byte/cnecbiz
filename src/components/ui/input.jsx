import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles - height 48px (h-12), rounded corners, light border
        "flex h-12 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm",
        // Placeholder styling
        "placeholder:text-gray-400",
        // Selection styling
        "selection:bg-orange-100 selection:text-orange-900",
        // File input styling
        "file:text-foreground file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        // Transition
        "transition-all duration-200 outline-none",
        // Focus state - Orange highlight
        "focus:border-orange-400 focus:ring-2 focus:ring-orange-100",
        // Disabled state
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
        // Error state
        "aria-invalid:ring-red-100 aria-invalid:border-red-400",
        // Dark mode
        "dark:bg-input/30 dark:border-gray-700 dark:placeholder:text-gray-500",
        className
      )}
      {...props} />
  );
}

export { Input }
