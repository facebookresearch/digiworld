import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from 'react'
import { musicStore } from '../models/MusicStore' // your MobX store
import { autorun } from 'mobx'

type PlaybackTimerContextType = {
  tick: number
}

const PlaybackTimerContext = createContext<
  PlaybackTimerContextType | undefined
>(undefined)

export const usePlaybackTimer = () => {
  const context = useContext(PlaybackTimerContext)
  if (!context) {
    throw new Error(
      'usePlaybackTimer must be used within PlaybackTimerProvider',
    )
  }
  return context
}

export const PlaybackTimerProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [tick, setTick] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSongIdRef = useRef<number | null>(null)

  // Start/stop timer based on isPlaying, and handle song completion
  useEffect(() => {
    const dispose = autorun(() => {
      const { isPlaying, pausedAt, startTimestamp } = musicStore.playbackState
      const song = musicStore.currentSong
      const songId = song?.id
      const duration = song?.duration ?? 0

      const getProgress = () => {
        if (!isPlaying || !startTimestamp) return pausedAt
        return (Date.now() - startTimestamp) / 1000 + pausedAt
      }

      // If song changed, reset and clean up
      if (lastSongIdRef.current && lastSongIdRef.current !== songId) {
        stopTimer()
        setTick(0)
      }

      lastSongIdRef.current = songId ?? null

      // Handle playback
      if (isPlaying) {
        // Start ticking
        if (!timerRef.current) {
          timerRef.current = setInterval(() => {
            const progress = getProgress()

            setTick(t => t + 1)

            if (progress >= duration) {
              stopTimer()
              musicStore.onSongComplete?.() // call MobX-provided next handler
            }
          }, 1000)
        }
      } else {
        // Paused or stopped
        stopTimer()
      }
    })

    return () => {
      dispose()
      stopTimer()
    }
  }, [])

  const stopTimer = () => {
    if (timerRef.current) {
      // @ts-ignore
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  return (
    <PlaybackTimerContext.Provider value={{ tick }}>
      {children}
    </PlaybackTimerContext.Provider>
  )
}
