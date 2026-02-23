import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    
    const variantStyles = {
      default: "bg-primary text-primary-content hover:bg-primary/90",
      outline: "border border-outline text-content-primary hover:bg-surface-dim",
      ghost: "hover:bg-surface-dim text-content-primary",
      destructive: "bg-error text-error-content hover:bg-error/90",
    }

    const sizeStyles = {
      default: "px-4 py-2 text-sm",
      sm: "px-3 py-1.5 text-xs",
      lg: "px-6 py-3 text-base",
    }

    return (
      <button
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
