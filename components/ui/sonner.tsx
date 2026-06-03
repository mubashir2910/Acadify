"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme()
  return (
    <Sonner
      richColors
      position="top-right"
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "light"}
      {...props}
    />
  )
}
