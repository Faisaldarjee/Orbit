"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Navbar } from "@/components/ui/Navbar"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { GlassCard } from "@/components/ui/GlassCard"
import { OrbitalLogo } from "@/components/ui/OrbitalLogo"
import Link from "next/link"
import { Mail, Lock, ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6">
      <div className="absolute top-8 left-8">
        <Link href="/" className="flex items-center gap-3">
          <OrbitalLogo />
          <span className="text-xl font-bold font-outfit">ORBIT</span>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8 md:p-10 border-white/10">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black mb-2 font-outfit">Welcome Back</h1>
            <p className="text-white/50 text-sm">Reconnect with your cosmic circle.</p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-bold text-center">{error}</div>}
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                <Input name="email" type="email" placeholder="commander@orbit.com" className="pl-12" required />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                <Input name="password" type="password" placeholder="••••••••" className="pl-12" required />
              </div>
            </div>

            <Button size="lg" className="w-full" disabled={loading}>
              {loading ? "Synching..." : "Enter Orbit"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-white/40">
              New explorer? <Link href="/signup" className="text-secondary hover:underline">Create an account</Link>
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}
