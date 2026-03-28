"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { MessageSquare, Users, Radio } from "lucide-react"

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [userGroups, setUserGroups] = useState<string[]>([])

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch user's groups to filter group notifications
      const { data: groups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
      
      if (groups) setUserGroups(groups.map(g => g.group_id))

      // 1. Listen for DMs
      const dmChannel = supabase
        .channel('global-dms')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
          filter: `receiver_id=eq.${user.id}`
        }, async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.sender_id)
            .single()
          
          toast.success(`Signal Received from ${profile?.full_name || 'Voyager'}`, {
            description: payload.new.content.slice(0, 50) + (payload.new.content.length > 50 ? '...' : ''),
            icon: <MessageSquare className="w-4 h-4 text-accent" />,
            duration: 5000,
          })
        })
        .subscribe()

      // 2. Listen for Group Join Requests (for commanders)
      const requestChannel = supabase
        .channel('global-requests')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_join_requests'
        }, async (payload) => {
          // Check if user is the commander of this group
          const { data: group } = await supabase
            .from('groups')
            .select('name, created_by')
            .eq('id', payload.new.group_id)
            .single()
          
          if (group && group.created_by === user.id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', payload.new.user_id)
              .single()

            toast.info(`Entry Request for ${group.name}`, {
              description: `${profile?.full_name || 'A Voyager'} is requesting synchronization.`,
              icon: <Radio className="w-4 h-4 text-primary" />,
              duration: 8000,
            })
          }
        })
        .subscribe()

      return () => {
        supabase.removeChannel(dmChannel)
        supabase.removeChannel(requestChannel)
      }
    }

    setup()
  }, [])

  return <>{children}</>
}
