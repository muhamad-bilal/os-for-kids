import React from 'react'

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  value: string
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  value: string
}

const TabsContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
}>({})

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className = '', children, defaultValue, value, onValueChange, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || '')
    const currentValue = value !== undefined ? value : internalValue
    const handleValueChange = onValueChange || setInternalValue

    return (
      <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
        <div
          ref={ref}
          className={`${className}`}
          {...props}
        >
          {children}
        </div>
      </TabsContext.Provider>
    )
  }
)
Tabs.displayName = 'Tabs'

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}
      {...props}
    >
      {children}
    </div>
  )
)
TabsList.displayName = 'TabsList'

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className = '', children, value, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    const isActive = context.value === value

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
          isActive
            ? 'bg-background text-foreground shadow-sm'
            : 'hover:bg-background/50'
        } ${className}`}
        onClick={() => context.onValueChange?.(value)}
        {...props}
      >
        {children}
      </button>
    )
  }
)
TabsTrigger.displayName = 'TabsTrigger'

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className = '', children, value, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    const isActive = context.value === value

    if (!isActive) return null

    return (
      <div
        ref={ref}
        className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TabsContent.displayName = 'TabsContent'
