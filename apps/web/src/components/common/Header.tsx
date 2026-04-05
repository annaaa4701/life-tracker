type HeaderProps = {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header class="app-header" role="banner">
      <div>
        <p class="app-date">{subtitle}</p>
        <h1>{title}</h1>
      </div>
      <p class="pillars" aria-label="pillars">
        <span>⚡</span>
        <span>🌱</span>
        <span>🎨</span>
        <span>💚</span>
      </p>
    </header>
  )
}
