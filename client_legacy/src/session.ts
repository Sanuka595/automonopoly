import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { Intent, Room } from './types'
import { mountPlatform, readLaunch } from './platform'
import { getMockRoom } from './mockData'

export type LobbyUser = { id: string; name: string }

export function useSession() {
  const [launch] = useState(readLaunch)
  const [seatId, setSeatId] = useState<string | null>(launch.dev ? (launch.id || null) : launch.id)
  const [roomId, setRoomId] = useState(launch.roomId)
  const [room, setRoom] = useState<Room | null>(() => launch.mock ? getMockRoom(Number(launch.mock)) : null)
  const [lobby, setLobby] = useState<LobbyUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(Boolean(launch.mock))
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (launch.mock) return
    if (!seatId) return
    mountPlatform()
    let active = true
    let current: Socket | null = null
    const name = launch.dev ? `Игрок ${seatId}` : launch.name

    void (async () => {
      let initData = launch.initData
      if (!initData) {
        const res = await fetch(
          `/dev/token?id=${encodeURIComponent(seatId)}&name=${encodeURIComponent(name)}`,
        )
        if (!res.ok) throw new Error('dev token failed')
        const data = (await res.json()) as { initData: string }
        initData = data.initData
      }
      if (!active) return
      current = io({ path: '/socket.io' })
      setSocket(current)
      current.on('connect', () => {
        setConnected(true)
        current?.emit(
          'auth',
          { initData, roomId },
          (authRes: { ok: boolean; error?: string }) => {
            if (!authRes.ok) setError(authRes.error ?? 'auth failed')
          },
        )
      })
      current.on('disconnect', () => setConnected(false))
      current.on('room:state', (next: Room) => {
        setRoom(next)
        setLobby([])
        setError(null)
      })
      current.on('lobby:update', (list: LobbyUser[]) => {
        setLobby(list)
        setRoom(null)
      })
    })().catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : 'connection error')
    })

    return () => {
      active = false
      current?.disconnect()
      setSocket(null)
      setConnected(false)
    }
  }, [seatId, roomId, launch.dev, launch.initData, launch.name, launch.mock])

  const sendIntent = (intent: Intent) => {
    socket?.emit('intent', intent, (res: { ok: boolean; error?: string; rolled?: number }) => {
      if (!res?.ok) setError(res?.error ?? 'error')
      else setError(null)
    })
  }

  const startMatch = () => {
    socket?.emit('lobby:start', (res: { ok: boolean; error?: string }) => {
      if (!res?.ok) setError(res?.error ?? 'cannot start')
    })
  }

  const pickSeat = (id: string, nextRoomId: string) => {
    setRoom(null)
    setLobby([])
    setError(null)
    setRoomId(nextRoomId.trim() || 'room1')
    setSeatId(id)
  }

  return {
    room,
    lobby,
    error,
    connected,
    myId: seatId ?? '',
    dev: launch.dev,
    roomId,
    sendIntent,
    startMatch,
    pickSeat,
  }
}
