/* eslint-disable react-refresh/only-export-components */

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
   "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-accent text-white shadow-lg shadow-accent/20 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30',
        destructive: 'bg-danger text-white shadow-sm hover:bg-danger/90',
        outline: 'border border-border-default bg-surface-raised text-text-secondary hover:bg-surface-hover hover:text-text-primary hover:border-border-hover',
        secondary: 'bg-surface-overlay text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        ghost: 'text-text-muted hover:text-text-secondary hover:bg-surface-hover',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-3.5 py-1.5',
        sm: 'h-8 px-2.5 text-xs',
        lg: 'h-10 px-5 text-sm',
        xl: 'h-11 px-6 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = 'Button'

export { Button, buttonVariants }
