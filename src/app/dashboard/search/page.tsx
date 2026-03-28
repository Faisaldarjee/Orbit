"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/GlassCard"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Search, UserPlus, Globe, Loader2, Sparkles, Satellite, Radio } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [])

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim() || !currentUser) return

    setLoading(true)
    
    // Search Profiles
    const { data: userData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .ilike('full_name', `%${query}%`)
      .neq('id', currentUser.id)
      .limit(5)

    // Search Groups
    const { data: groupData } = await supabase
      .from('groups')
      .select('*, members:group_members(count)')
      .ilike('name', `%${query}%`)
      .limit(5)

    if (userData) setUsers(userData)
    if (groupData) setGroups(groupData)
    setLoading(false)
  }

  const sendSignalRequest = async (targetId: string) => {
    const { error } = await supabase
      .from('dm_messages')
      .insert([{
        sender_id: currentUser.id,
        receiver_id: targetId,
        content: "Signal Request: I'd like to establish a private orbit with you.",
        status: 'pending'
      }])
    
    if (error) {
      toast.error("Signal Transmission Failed")
    } else {
      toast.success("Signal Request Transmitted")
    }
  }

  const requestJoinGroup = async (groupId: string) => {
    const { error } = await supabase
      .from('group_join_requests')
      .insert([{
        group_id: groupId,
        user_id: currentUser.id,
        status: 'pending'
      }])
    
    if (error) {
      if (error.code === '23505') {
        toast.info("Request already in orbit.")
      } else {
        toast.error("Transmission Interrupted")
      }
    } else {
      toast.success("Entry Request Sent to Commander")
    }
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center md:text-left">
          <h1 className="text-4xl font-black font-outfit flex items-center justify-center md:justify-start gap-3 mb-2">
            <Search className="w-10 h-10 text-accent" />
            Orbital Search
          </h1>
          <p className="text-white/40 text-sm uppercase tracking-[0.2em] font-bold">Discover voyagers and stellar systems across the cosmos.</p>
        </header>

        <form onSubmit={handleSearch} className="relative mb-12">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent to-primary rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <Input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, frequency, or system..." 
              className="h-16 pl-6 pr-32 bg-background border-white/5 text-lg font-medium rounded-2xl focus:ring-accent/40"
            />
            <Button 
              type="submit"
              className="absolute right-2 top-2 bottom-2 px-8 bg-accent text-white font-black hover:scale-105 transition-all"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "SCAN"}
            </Button>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Voyagers Results */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-accent" /> Identified Voyagers
            </h3>
            {users.length === 0 && !loading && query && (
              <p className="text-[10px] text-white/20 italic">No human signals detected in this sector.</p>
            )}
            <AnimatePresence>
              {users.map((user) => (
                <motion.div 
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <GlassCard className="p-4 border-white/5 hover:bg-white/[0.03] transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center font-bold text-accent overflow-hidden border border-white/10">
                        {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user.full_name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-black font-outfit truncate">{user.full_name}</div>
                        <div className="text-[8px] text-white/30 uppercase font-bold tracking-widest">Voyager ID: {user.id.slice(0, 8)}</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => sendSignalRequest(user.id)} className="w-10 h-10 p-0 rounded-xl bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all">
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Systems Results */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
              <Globe className="w-3 h-3 text-secondary" /> Stellar Systems
            </h3>
            {groups.length === 0 && !loading && query && (
              <p className="text-[10px] text-white/20 italic">No planetary systems found in this nebula.</p>
            )}
            <AnimatePresence>
              {groups.map((group) => (
                <motion.div 
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <GlassCard className="p-4 border-white/5 hover:bg-white/[0.03] transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20">
                        <Satellite className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-black font-outfit truncate">{group.name}</div>
                        <div className="text-[8px] text-white/30 uppercase font-bold tracking-widest">{group.members[0].count} Voyagers Synced</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => requestJoinGroup(group.id)} className="px-3 h-10 rounded-xl bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
                         <Radio className="w-3 h-3 mr-2" /> Request Entry
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {!query && !loading && (
          <div className="mt-24 text-center opacity-20">
            <Globe className="w-24 h-24 mx-auto mb-6 animate-spin-slow text-white/40" />
            <p className="text-sm font-black uppercase tracking-[0.3em]">Initialize Deep Scan</p>
            <p className="text-[10px] mt-2 italic font-medium max-w-[300px] mx-auto">Transmit frequencies to discover connections across the orbital network.</p>
          </div>
        )}
      </div>
    </div>
  )
}
