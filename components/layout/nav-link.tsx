"use client"

import Link, { useLinkStatus } from "next/link"
import * as React from "react"

interface NavLinkChildProps {
  pending: boolean
}

type NavLinkExtraAnchorProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "onClick" | "children" | "className"
>

interface NavLinkProps extends NavLinkExtraAnchorProps {
  href: string
  prefetch?: boolean | "auto" | null
  className?: string
  onNavigate?: () => void
  children: (state: NavLinkChildProps) => React.ReactNode
}

// useLinkStatus must be read inside a <Link> descendant. NavLink exposes the
// pending state via a render prop so the caller controls how to reflect it.
function PendingProbe({
  children,
}: {
  children: (state: NavLinkChildProps) => React.ReactNode
}) {
  const { pending } = useLinkStatus()
  return <>{children({ pending })}</>
}

export function NavLink({
  href,
  prefetch,
  className,
  onNavigate,
  children,
  ...rest
}: NavLinkProps) {
  // Suppress duplicate clicks even before useLinkStatus flips in the descendant.
  const [clicked, setClicked] = React.useState(false)

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={className}
      {...rest}
      onClick={(event) => {
        if (clicked) {
          event.preventDefault()
          return
        }
        setClicked(true)
        window.setTimeout(() => setClicked(false), 600)
        onNavigate?.()
      }}
    >
      <PendingProbe>{children}</PendingProbe>
    </Link>
  )
}
