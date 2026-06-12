"use client"

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

function getInitials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
}

export const Logo = ({
    className,
    textClassName,
    logoUrl,
    label,
}: {
    className?: string
    // Override the wordmark colour (e.g. white when the header sits over the dark hero video)
    textClassName?: string
    // School logo URL (Cloudinary). When omitted, the default Acadify branding is shown.
    logoUrl?: string | null
    // School name. When provided, the school identity replaces the Acadify wordmark.
    label?: string
}) => {
    // Fall back to the initials square if the remote logo fails to load.
    const [logoFailed, setLogoFailed] = useState(false)

    // School branding path: render the school's logo + name (with graceful fallbacks).
    if (label) {
        const showImage = logoUrl && !logoFailed
        return (
            <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
                {showImage ? (
                    <Image
                        src={logoUrl}
                        alt={label}
                        width={40}
                        height={40}
                        className="h-10 w-10 shrink-0 rounded-md object-contain"
                        onError={() => setLogoFailed(true)}
                        priority
                    />
                ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                        {getInitials(label)}
                    </div>
                )}
                <span
                    className={cn(
                        'max-w-[160px] truncate text-lg font-bold tracking-tight text-foreground',
                        textClassName,
                    )}
                >
                    {label}
                </span>
            </div>
        )
    }

    // Default Acadify branding (marketing pages, super admin).
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
