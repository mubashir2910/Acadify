import React from "react"

type StarBorderProps<T extends React.ElementType> = React.ComponentPropsWithoutRef<T> & {
  as?: T
  className?: string
  /** Classes for the inner content box (override to control padding / bg / text). */
  innerClassName?: string
  /** Corner radius in px (applied to outer + inner). */
  radius?: number
  children?: React.ReactNode
  color?: string
  speed?: React.CSSProperties["animationDuration"]
  thickness?: number
}

const StarBorder = <T extends React.ElementType = "button">({
  as,
  className = "",
  innerClassName = "bg-gradient-to-b from-black to-gray-900 border border-gray-800 text-white text-center text-[16px] py-[16px] px-[26px]",
  radius = 20,
  color = "white",
  speed = "6s",
  thickness = 1,
  children,
  ...rest
}: StarBorderProps<T>) => {
  const Component = as || "button"

  return (
    <Component
      className={`relative inline-block overflow-hidden ${className}`}
      {...(rest as Record<string, unknown>)}
      style={{
        padding: `${thickness}px 0`,
        borderRadius: `${radius}px`,
        ...(rest as { style?: React.CSSProperties }).style,
      }}
    >
      <div
        className="absolute w-[300%] h-[50%] opacity-70 bottom-[-11px] right-[-250%] rounded-full animate-star-movement-bottom z-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <div
        className="absolute w-[300%] h-[50%] opacity-70 top-[-10px] left-[-250%] rounded-full animate-star-movement-top z-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <div
        className={`relative z-[1] ${innerClassName}`}
        style={{ borderRadius: `${radius}px` }}
      >
        {children}
      </div>
    </Component>
  )
}

export default StarBorder
