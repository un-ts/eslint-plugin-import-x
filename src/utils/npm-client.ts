import type { SetValue } from '../types.js'

const NPM = 'npm'

export const NPM_CLIENTS = new Set([
  NPM,
  'yarn',
  'pnpm',
  'bun',
  'deno',
] as const)

export type NpmClient = SetValue<typeof NPM_CLIENTS>

let npmClient: NpmClient | undefined

export const getNpmClient = (): NpmClient => {
  if (npmClient) {
    return npmClient
  }

  const client = process.env.npm_config_user_agent?.split('/')[0]

  npmClient = client && NPM_CLIENTS.has(client) ? (client as NpmClient) : NPM

  return npmClient
}

export const getNpmInstallCommand = (packageName: string) =>
  `${getNpmClient()} ${npmClient === NPM ? 'i' : 'add'} ${npmClient === 'deno' ? `${NPM}:` : ''}${packageName}`
