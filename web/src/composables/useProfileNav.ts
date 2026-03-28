import { ref } from 'vue'
import type { Component } from 'vue'

interface Section {
  key: string
  label: string
  icon: Component
}

export function useProfileNav(sections: Section[]) {
  const activeSection = ref(sections[0]?.key || 'profile')

  const setActive = (key: string) => {
    activeSection.value = key
  }

  const isActive = (key: string) => activeSection.value === key

  return {
    activeSection,
    setActive,
    isActive
  }
}
