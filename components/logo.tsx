import Image from 'next/image'
import { cn } from '@/lib/utils'

export const Logo = ({
    className,
    textClassName,
}: {
    className?: string
    // Override the wordmark colour (e.g. white when the header sits over the dark hero video)
    textClassName?: string
}) => {
    return (
        <div className={cn('flex items-center', className)}>
            <Image
                src="/acadify.png"
                alt="Acadify"
                width={50}
                height={50}
                className="h-10 w-10 shrink-0"
                priority
            />
            <span className={cn('text-2xl font-bold tracking-tight text-primary', textClassName)}>ACADIFY</span>
        </div>
    )
}

export const LogoIcon = ({ className }: { className?: string }) => {
    return (
        <Image
            src="/acadify.png"
            alt="Acadify"
            width={36}
            height={36}
            className={cn('h-9 w-9 shrink-0', className)}
            priority
        />
    )
}
