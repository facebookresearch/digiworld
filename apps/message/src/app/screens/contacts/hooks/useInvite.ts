// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useState, useCallback } from 'react'
import { useToast } from '@andojo/shared-theme'
import { InviteState } from '@/app/types'

const useInvite = () => {
  const [invitedContacts, setInvitedContacts] = useState<InviteState>({})
  const { show: showToast } = useToast()

  const sendInvite = useCallback(
    async (contactId: string, phoneNumber: string) => {
      try {
        // Set the contact as invited (shows blue tick)
        setInvitedContacts(prev => ({
          ...prev,
          [contactId]: true,
        }))

        // Show toast notification
        showToast({
          title: `Invite sent to ${phoneNumber}`,
          preset: 'success',
          duration: 2000,
        })

        // Reset the blue tick after 3 seconds
        setTimeout(() => {
          setInvitedContacts(prev => ({
            ...prev,
            [contactId]: false,
          }))
        }, 3000)

        // Here you would typically make an API call to actually send the invite
        console.log(`📤 Sending invite to ${phoneNumber}`)
      } catch (error) {
        console.error('❌ Error sending invite:', error)
        // Reset the state if there's an error
        setInvitedContacts(prev => ({
          ...prev,
          [contactId]: false,
        }))
      }
    },
    [showToast],
  )

  const isInvited = useCallback(
    (contactId: string) => {
      return invitedContacts[contactId] || false
    },
    [invitedContacts],
  )

  return {
    sendInvite,
    isInvited,
  }
}

export default useInvite
