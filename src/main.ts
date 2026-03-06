import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

let app: any
let themeObserver: MutationObserver | null = null

function hostHasDarkClass() {
  return (
    document.documentElement.classList.contains('dark') ||
    document.body.classList.contains('dark')
  )
}

function syncThemeClass(target: HTMLElement) {
  target.classList.toggle('dark', hostHasDarkClass())
}

export function mount(el: HTMLElement) {
  syncThemeClass(el)

  app = createApp(App)
  app.mount(el)

  themeObserver = new MutationObserver(() => {
    syncThemeClass(el)
  })

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })

  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  })
}

export function unmount() {
  if (themeObserver) {
    themeObserver.disconnect()
    themeObserver = null
  }

  if (app) {
    app.unmount()
  }
}
