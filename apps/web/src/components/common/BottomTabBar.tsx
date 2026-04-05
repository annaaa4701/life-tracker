import { TAB_ITEMS, type TabKey } from "../../types"

type BottomTabBarProps = {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
}

export function BottomTabBar({ activeTab, onChange }: BottomTabBarProps) {
  return (
    <nav class="bottom-tabbar" aria-label="Primary navigation">
      {TAB_ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          class={item.key === activeTab ? "tab-item is-active" : "tab-item"}
          onClick={() => onChange(item.key)}
          aria-current={item.key === activeTab ? "page" : undefined}
        >
          <span class="tab-icon" aria-hidden="true">
            {item.icon}
          </span>
          <span class="tab-label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
