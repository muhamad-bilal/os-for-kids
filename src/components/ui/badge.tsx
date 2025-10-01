import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

const badgeVariants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/80',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
  outline: 'text-foreground border border-input'
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    const variantClasses = badgeVariants[variant]
    
    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Badge.displayName = 'Badge'
