"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/GlassCard"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Send, Globe, Search, Sparkles, LogIn } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { OrbitalLogo } from "@/components/ui/OrbitalLogo"

export default function DemoPage() {
  const [messages, setMessages] = useState([
    { id: 1, user: "Nova", text: "Welcome to the Orbit Demo! 🚀", meta: "Commander", color: "text-secondary" },
    { id: 2, user: "StellarExplorer", text: "This is what the real chat looks like.", meta: "Explorer", color: "text-primary" },
  ])
  const [input, setInput] = useState("")

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setMessages([...messages, { id: Date.now(), user: "You (Demo)", text: input, meta: "Vistor", color: "text-white" }])
    setInput("")
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 h-screen overflow-hidden">
      <header className="flex items-center justify-between mb-8">
        <Link href="/" className="flex items-center gap-3">
          <OrbitalLogo />
          <h1 className="text-2xl font-black font-outfit uppercase tracking-tighter">ORBIT <span className="text-white/20">DEMO</span></h1>
        </Link>

        <Link href="/signup">
          <Button variant="secondary" size="sm">
            <LogIn className="w-4 h-4 mr-2" />
            Get Real Access
          </Button>
        </Link>
      </header>

      <div className="flex-1 flex gap-6 overflow-hidden max-w-5xl mx-auto w-full">
        <div className="flex-1 flex flex-col glass-card border-white/5 relative">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-3 text-[10px] text-secondary font-black uppercase tracking-[0.2em] text-center mb-4">
              DEMO MODE: MESSAGES ARE NOT SAVED
            </div>
            <AnimatePresence>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-1 max-w-[80%]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold font-outfit tracking-wider ${m.color}`}>{m.user}</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 px-4 py-2.5 rounded-2xl rounded-tl-none">
                    <p className="text-white/80 text-sm leading-relaxed">{m.text}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-white/[0.02]">
            <div className="relative flex items-center gap-3">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Try sending a message..." 
                className="pr-16"
              />
              <Button type="submit" size="sm" className="absolute right-2 px-3">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
