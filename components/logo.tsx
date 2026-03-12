import Image from 'next/image'
import { cn } from '@/lib/utils'

export const Logo = ({ className }: { className?: string }) => {
    return (
        <div className={cn('flex items-center', className)}>
            <Image
                src="/acadify.png"
                alt="Acadify"
                width={120}
                height={32}
                className="h-12 w-auto"
                priority
            />
            <span className="text-3xl font-bold tracking-tight text-primary">ACADIFY</span>
        </div>
    )
}

export const LogoIcon = ({ className }: { className?: string }) => {
    return (
        <Image
            src="/acadify.png"
            alt="Acadify"
            width={40}
            height={40}
            className={cn('size-8', className)}
            priority
        />
    )
}
