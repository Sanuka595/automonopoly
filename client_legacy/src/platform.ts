import { initData, swipeBehavior, viewport } from '@telegram-apps/sdk-react'

export function mountPlatform(): void {
  if (viewport.mount.isAvailable()) viewport.mount()
  if (viewport.bindCssVars.isAvailable()) viewport.bindCssVars()
  if (viewport.expand.isAvailable()) viewport.expand()
  if (swipeBehavior.mount.isAvailable()) swipeBehavior.mount()
  if (swipeBehavior.disableVertical.isAvailable()) swipeBehavior.disableVertical()
}

export function readLaunch(): { initData: string | null; id: string; name: string; roomId: string; dev: boolean; mock: string | null } {
  const params = new URLSearchParams(location.search)
  const mock = params.get('mock')
  let id = params.get('id') ?? (mock ? '1' : '')
  let name = params.get('name') ?? (id ? `Игрок ${id}` : '')
  let roomId = params.get('room') ?? 'room1'
  let raw: string | null = null
  try {
    initData.restore()
    raw = initData.raw() ?? null
    const user = initData.user()
    const start = initData.startParam()
    if (user) {
      id = String(user.id)
      name = user.first_name
    }
    if (start) roomId = start
  } catch {
    raw = null
  }
  return { initData: raw, id, name, roomId, dev: raw == null, mock }
}
