"use client"

import Link from "next/link"
import { OrbitalLogo } from "./OrbitalLogo"
import { Button } from "./Button"

export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-card !rounded-full py-2 px-6">
        <Link href="/" className="flex items-center gap-3">
          <OrbitalLogo />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent font-outfit">
            ORBIT
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Features</Link>
          <Link href="#about" className="text-sm font-medium text-white/60 hover:text-white transition-colors">About</Link>
          <Link href="#community" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Community</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" size="sm">Login</Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary" size="sm">Get Started</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
