"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/GlassCard"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { User, Shield, Camera, Bell, Zap, LogOut, ChevronRight, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [fullName, setFullName] = useState("")
  const [privacy, setPrivacy] = useState("public")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (data) {
          setProfile(data)
          setFullName(data.full_name || "")
          setPrivacy(data.privacy_mode || "public")
          setAvatarUrl(data.avatar_url)
        }
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUpdating(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${profile.id}-${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('Avatar')
      .upload(filePath, file)

    if (uploadError) {
      alert("Upload failed: " + uploadError.message)
    } else {
      const { data: { publicUrl } } = supabase.storage.from('Avatar').getPublicUrl(filePath)
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)
      
      if (!updateError) setAvatarUrl(publicUrl)
    }
    setUpdating(false)
  }

  const handleUpdate = async () => {
    if (!profile) return
    setUpdating(true)
    const { error } = await supabase
      .from('profiles')
      .update({ 
        full_name: fullName, 
        privacy_mode: privacy,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
    
    if (error) {
      alert("Update failed: " + error.message)
    } else {
      alert("Identity Protocol Updated.")
      // Update local state to reflect changes immediately
      setProfile({ ...profile, full_name: fullName, privacy_mode: privacy })
    }
    setUpdating(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        <header className="mb-12">
          <h1 className="text-3xl font-black font-outfit flex items-center gap-2">
            <User className="w-8 h-8 text-primary" />
            Profile & Settings
          </h1>
          <p className="text-white/40 text-sm">Manage your cosmic identity and privacy protocols.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-8 border-white/5">
              <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary to-secondary p-1">
                    <div className="w-full h-full rounded-[1.8rem] bg-background overflow-hidden flex items-center justify-center text-3xl font-black font-outfit">
                      {avatarUrl ? (
                         <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        fullName?.[0]?.toUpperCase() || "V"
                      )}
                    </div>
                  </div>
                  <label className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all cursor-pointer">
                    <Camera className="w-4 h-4" />
                    <input type="file" className="hidden" onChange={handleAvatarUpload} accept="image/*" />
                  </label>
                </div>
                
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-2xl font-black font-outfit mb-1">{fullName || "Unknown Voyager"}</h2>
                  <p className="text-white/40 text-sm mb-4 italic">"Exploring the outer rim of digital connection."</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-black uppercase tracking-widest leading-none flex items-center h-6">COMMANDER</div>
                    <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/40 font-black uppercase tracking-widest leading-none flex items-center h-6">SINCE 2026</div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Display Name</label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Astronaut Name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Universal Signal</label>
                    <Input value={profile?.id?.slice(0, 8)} disabled className="opacity-50" />
                  </div>
                </div>
                <Button className="w-full md:w-auto" onClick={handleUpdate} disabled={updating}>
                  {updating ? "Synching..." : "Update Protocol"}
                </Button>
              </div>
            </GlassCard>

            <GlassCard className="p-8 border-white/5 bg-accent/5 overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                 <Shield className="w-32 h-32 text-accent" />
               </div>
               <h3 className="text-xl font-black font-outfit mb-6 flex items-center gap-2">
                 <Shield className="w-5 h-5 text-accent" />
                 Privacy Protocols
               </h3>
               
               <div className="space-y-4">
                 {[
                   { id: 'public', title: 'Open Signal (Public)', desc: 'Anyone in Orbit can message you directly.', color: 'text-secondary' },
                   { id: 'request', title: 'Shielded (Private)', desc: 'Users must request a signal before chatting.', color: 'text-primary' },
                   { id: 'stealth', title: 'Stealth Mode', desc: 'Only visible to your Solar Systems.', color: 'text-white/40' },
                 ].map((mode) => (
                   <div 
                    key={mode.id}
                    className={cn(
                      "p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between",
                      privacy === mode.id ? "bg-white/10 border-accent/40" : "bg-white/5 border-transparent hover:border-white/10"
                    )}
                    onClick={() => setPrivacy(mode.id)}
                   >
                     <div>
                       <div className={cn("text-sm font-bold font-outfit", privacy === mode.id ? mode.color : "text-white/80")}>{mode.title}</div>
                       <div className="text-xs text-white/30">{mode.desc}</div>
                     </div>
                     {privacy === mode.id && <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_#f43f5e]" />}
                   </div>
                 ))}
               </div>
            </GlassCard>
          </div>

          <div className="space-y-6">
            <GlassCard className="p-6 border-white/5">
              <h3 className="text-sm font-black font-outfit uppercase tracking-widest text-white/20 mb-6 flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notifications
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60 font-medium">Sound Signals</span>
                  <div className="w-10 h-5 rounded-full bg-primary/20 relative cursor-pointer">
                    <div className="absolute left-1 top-1 w-3 h-3 rounded-full bg-primary" />
                  </div>
                </div>
              </div>
            </GlassCard>

            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-accent/5 text-white/30 hover:text-accent transition-all group"
            >
              <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest"><LogOut className="w-4 h-4" /> Disconnect</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
