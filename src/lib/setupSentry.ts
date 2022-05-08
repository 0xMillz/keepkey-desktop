import * as Sentry from '@sentry/electron'
import { ipcRenderer } from 'electron'

export const setupSentry = () => {
  ipcRenderer.send('@app/sentry-dsn')

  ipcRenderer.once('@app/sentry-dsn', (_event, SENTRY_DSN) => {
    Sentry.init({ dsn: SENTRY_DSN })
  })
}
