import Link from 'next/link'
import LogoIcon from './LogoIcon'
import { clsx } from 'clsx'

interface LogoProps {
  subtitle?: string
  href?: string | null
  iconSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showText?: boolean
  /** stacked: imagen arriba del texto; inline: imagen al lado */
  layout?: 'stacked' | 'inline'
  align?: 'start' | 'center'
  variant?: 'default' | 'light'
}

export default function Logo({
  subtitle,
  href = '/dashboard',
  iconSize = 'sm',
  className,
  showText = true,
  layout = 'stacked',
  align = 'center',
  variant = 'default',
}: LogoProps) {
  const content = (
    <>
      <LogoIcon size={iconSize} className="drop-shadow-sm" />
      {showText && (
        <div className={clsx('min-w-0', align === 'center' ? 'text-center' : 'text-left')}>
          <p
            className={clsx(
              'font-semibold leading-tight',
              variant === 'light' ? 'text-white' : 'text-neutral-900',
              iconSize === 'xl' ? 'text-xl' : iconSize === 'lg' ? 'text-lg' : 'text-sm'
            )}
          >
            Aprendamos Juntos
          </p>
          {subtitle && (
            <p
              className={clsx(
                'text-2xs mt-0.5 leading-none truncate max-w-[160px]',
                variant === 'light' ? 'text-primary-100' : 'text-neutral-400'
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </>
  )

  const wrapperClass = clsx(
    'group',
    layout === 'stacked'
      ? clsx('flex flex-col gap-1.5', align === 'start' ? 'items-start' : 'items-center')
      : clsx('flex items-center gap-2.5', align === 'start' ? 'justify-start' : 'justify-center'),
    className
  )

  if (href) {
    return (
      <Link href={href} className={wrapperClass}>
        {content}
      </Link>
    )
  }

  return <div className={wrapperClass}>{content}</div>
}
