import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white font-semibold',
  secondary: 'bg-surface-2 text-accent font-semibold',
  danger: 'bg-surface-2 text-danger font-semibold',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-[17px] active:opacity-70 disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

/** Primary action pinned to the bottom of the screen (thumb zone), above the tab bar. */
export function BottomAction(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-6 pb-3">
      <Button {...props} />
    </div>
  )
}
