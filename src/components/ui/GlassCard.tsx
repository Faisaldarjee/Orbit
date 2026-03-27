import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  hover?: boolean
}

export const GlassCard = ({ children, className, hover = true, ...props }: GlassCardProps) => {
  return (
    <motion.div
      whileHover={hover ? { translateY: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" } : {}}
      className={cn(
        "glass-card p-6 rounded-[2rem] overflow-hidden relative",
        className
      )}
      {...props}
    >
      {/* Subtle INNER glow */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/5 to-transparent" />
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}
