import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import "./globals.css"

export const metadata: Metadata = {
  title: "Predictor IA — Mundial 2026 | MediaFox Sports",
  description: "Proyecciones estadísticas de todos los mercados del Mundial 2026",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <header className="sticky top-0 z-50 bg-[var(--background)]">
          {/* Orange top accent bar */}
          <div className="h-[3px] w-full bg-[var(--accent)]" />
          <div className="border-b border-[var(--border)]">
            <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center shrink-0">
                <Image
                  src="/images/logo-mfs-2.png"
                  alt="MediaFox Sports"
                  width={180}
                  height={52}
                  className="object-contain h-12 w-auto"
                  priority
                />
              </Link>
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-[9px] tracking-[0.5em] uppercase text-[var(--accent)] font-bold">
                  IA Predictor
                </span>
                <span className="text-[var(--border)]">|</span>
                <span className="text-[11px] font-bold tracking-[0.2em] text-[var(--foreground)] uppercase">
                  Mundial 2026
                </span>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--border)] mt-16">
          <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
            <span className="text-[10px] text-[var(--muted)] tracking-wider uppercase">
              MediaFox Sports · Análisis IA
            </span>
            <span className="text-[10px] text-[var(--muted)]">
              Solo entretenimiento — sin apuestas
            </span>
          </div>
        </footer>
      </body>
    </html>
  )
}
