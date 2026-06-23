import { Toaster as Sonner } from 'sonner'

function Toaster({ ...props }) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-surface-raised group-[.toaster]:text-text-primary group-[.toaster]:border-border-default group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl',
          description: 'group-[.toast]:text-text-muted',
          actionButton:
            'group-[.toast]:bg-accent group-[.toast]:text-white',
          cancelButton:
            'group-[.toast]:bg-surface-overlay group-[.toast]:text-text-muted',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
