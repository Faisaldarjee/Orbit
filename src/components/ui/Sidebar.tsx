"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { OrbitalLogo } from "@/components/ui/OrbitalLogo"
import { Globe, MessageSquare, Users, Settings, LogOut, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { name: "Public Orb", icon: Globe, href: "/dashboard", color: "text-secondary" },
  { name: "Private Moon", icon: MessageSquare, href: "/dashboard/private", color: "text-primary" },
  { name: "Solar Systems", icon: Users, href: "/dashboard/groups", color: "text-accent" },
]

export const Sidebar = () => {
  const pathname = usePathname()

  return (
    <div className="w-20 md:w-64 h-full flex flex-col glass-card !rounded-none border-r border-white/5 p-4 transition-all duration-300">
      <div className="flex items-center gap-3 mb-10 px-2 mt-2">
        <OrbitalLogo />
        <span className="hidden md:block text-xl font-black font-outfit tracking-tighter">ORBIT</span>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 group relative",
                isActive ? "bg-white/5 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("w-6 h-6", isActive ? item.color : "group-hover:text-white")} />
              <span className="hidden md:block font-medium">{item.name}</span>
              {isActive && (
                <div className={cn("absolute left-0 w-1 h-6 rounded-r-full", item.color.replace('text-', 'bg-'))} />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-4 pt-4 border-t border-white/5">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 px-3 py-3 rounded-2xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
        >
          <User className="w-6 h-6" />
          <span className="hidden md:block font-medium">Profile</span>
        </Link>
        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-3 px-3 py-3 rounded-2xl text-white/40 hover:text-accent hover:bg-accent/5 transition-all w-full"
        >
          <LogOut className="w-6 h-6" />
          <span className="hidden md:block font-medium">Logout</span>
        </button>
      </div>
    </div>
  )
}
