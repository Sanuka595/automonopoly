export const euro = (value: string): string =>
  `${Number(value).toLocaleString('ru-RU')} €`

export const clock = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const initial = (name: string): string => name.trim().charAt(0).toUpperCase() || '?'
