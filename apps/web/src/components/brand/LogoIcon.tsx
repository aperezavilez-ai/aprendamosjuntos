import Image from 'next/image'
import { clsx } from 'clsx'

interface LogoIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  xs: { width: 48, height: 36 },
  sm: { width: 64, height: 48 },
  md: { width: 88, height: 66 },
  lg: { width: 120, height: 90 },
  xl: { width: 160, height: 120 },
}

export default function LogoIcon({ size = 'sm', className }: LogoIconProps) {
  const dims = sizeMap[size]

  return (
    <Image
      src="/brand/logo.png"
      alt=""
      width={dims.width}
      height={dims.height}
      priority
      className={clsx('shrink-0 object-contain', className)}
      aria-hidden
    />
  )
}
