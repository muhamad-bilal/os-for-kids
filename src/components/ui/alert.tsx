import React from 'react'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'default' | 'destructive'
}

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

const alertVariants = {
  default: 'bg-background text-foreground border',
  destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive'
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    const variantClasses = alertVariants[variant]
    
    return (
      <div
        ref={ref}
        role="alert"
        className={`relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground ${variantClasses} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Alert.displayName = 'Alert'

export const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`text-sm [&_p]:leading-relaxed ${className}`}
      {...props}
    >
      {children}
    </div>
  )
)
AlertDescription.displayName = 'AlertDescription'
