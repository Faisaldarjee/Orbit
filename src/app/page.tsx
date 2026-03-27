"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Navbar } from "@/components/ui/Navbar"
import { Button } from "@/components/ui/Button"
import { GlassCard } from "@/components/ui/GlassCard"
import { Globe, Lock, Users, Sparkles, ArrowRight } from "lucide-react"

export default function Home() {
  const features = [
    {
      title: "Public Orb",
      description: "Broadcast your thoughts to the entire cosmic community. Real-time, global, and engaging.",
      icon: <Globe className="w-8 h-8 text-secondary" />,
      color: "from-secondary/20 to-transparent"
    },
    {
      title: "Private Moon",
      description: "Secure, invite-only conversations. Request access and chat only when you're ready.",
      icon: <Lock className="w-8 h-8 text-primary" />,
      color: "from-primary/20 to-transparent"
    },
    {
      title: "Solar Systems",
      description: "Create your own universe. Share a link, invite your squad, and rule your orbit.",
      icon: <Users className="w-8 h-8 text-accent" />,
      color: "from-accent/20 to-transparent"
    }
  ]

  return (
    <div className="relative min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center pt-32 pb-20 px-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto mb-16 relative z-10"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-button mb-8 text-sm font-medium text-secondary"
          >
            <Sparkles className="w-4 h-4" />
            <span>Discover the Next Frontier of Chat</span>
          </motion.div>
          
          <h1 className="text-6xl md:text-8xl font-black font-outfit mb-6 tracking-tight">
            Connect Beyond the <br />
            <span className="text-gradient">Atmosphere</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/50 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            Orbit is more than a chat app. It's an interactive universe where every message travels at the speed of light.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/signup">
              <Button size="lg" className="group">
                Launch Orbit 
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="ghost" size="lg">
                Explore Galaxy (Demo)
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto relative z-10">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1, duration: 0.8 }}
            >
              <Link href="/demo">
                <GlassCard className="h-full border-t border-l border-white/10 group cursor-pointer transition-all active:scale-95">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="mb-6">{feature.icon}</div>
                  <h3 className="text-2xl font-bold mb-4 font-outfit">{feature.title}</h3>
                  <p className="text-white/40 leading-relaxed font-light">
                    {feature.description}
                  </p>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Decorative Orbs */}
      <div className="fixed top-1/2 left-0 -translate-y-1/2 w-[30vw] h-[30vw] bg-primary/5 rounded-full blur-[150px] -z-10" />
      <div className="fixed top-1/4 right-0 w-[20vw] h-[20vw] bg-secondary/5 rounded-full blur-[100px] -z-10" />
    </div>
  )
}
