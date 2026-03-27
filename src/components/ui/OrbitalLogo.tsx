"use client"

import { motion } from "framer-motion"
import { Orbit } from "lucide-react"

export const OrbitalLogo = () => {
  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      {/* Outer Rotating Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 border-2 border-dashed border-secondary/30 rounded-full"
      />
      
      {/* Small Orbiting Planet */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0"
      >
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-secondary rounded-full shadow-[0_0_8px_#06b6d4]" />
      </motion.div>

      {/* Center Core */}
      <div className="relative z-10 p-2 bg-primary/20 rounded-full backdrop-blur-md border border-primary/40">
        <Orbit className="w-6 h-6 text-primary" />
      </div>
    </div>
  )
}
