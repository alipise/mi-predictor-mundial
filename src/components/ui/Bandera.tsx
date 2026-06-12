import { getFlagUrl } from "@/lib/flags"

type Props = {
  codigo: string
  size?: number
  className?: string
}

export function Bandera({ codigo, size = 32, className = "" }: Props) {
  const src = getFlagUrl(codigo, size <= 24 ? 20 : 40)
  if (!src) return <span className="inline-block bg-[var(--border)] rounded-sm" style={{ width: size, height: Math.round(size * 0.67) }} />
  return (
    <img
      src={src}
      alt={codigo}
      width={size}
      height={Math.round(size * 0.67)}
      className={`object-cover rounded-sm shrink-0 ${className}`}
    />
  )
}
