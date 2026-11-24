import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

export const name = 'wisdom-fountain'
export const inject = ['commands', 'systemPrompt']

export function apply(ctx) {
  const active = new Set()
  const local = file => new URL(file, import.meta.url)
  const persona = ['system.txt', 'terms.json'].map(file => readFileSync(local(file), 'utf8')).join('\n')
  let child
  let address
  ctx.systemPrompt.section({
    name: 'wisdom-fountain:persona',
    order: 10150,
    interpolate: false,
    text: ({ agent }) => active.has(agent?.session.id) ? persona : '',
  })

  function openPage() {
    if (address) return address
    const python = process.env.WISDOM_PYTHON || (process.platform === 'win32' ? 'python' : 'python3')
    const service = spawn(python, [fileURLToPath(local('server.py')), process.env.WISDOM_PORT || '8765'], {
      stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })
    child = service
    address = new Promise((resolve, reject) => {
      let diagnostic = ''
      const lines = createInterface({ input: service.stdout })
      lines.on('line', line => {
        const url = line.match(/http:\/\/127\.0\.0\.1:\d+$/)
        if (url) resolve(url[0])
      })
      service.stderr.on('data', chunk => { diagnostic = (diagnostic + chunk).slice(-1500) })
      service.once('error', reject)
      service.once('close', () => {
        if (child === service) { child = undefined; address = undefined }
        reject(new Error(diagnostic.trim() || '界面进程已退出'))
      })
    })
    return address
  }

  ctx.on('dispose', () => child?.kill())
  ctx.commands.register({
    name: 'juche',
    description: '智慧之泉 · 切换当前会话口吻或打开复刻界面',
    input: { hint: '[ui | off]' },
    async handler({ agent, rawInput }) {
      const option = rawInput.trim()
      const id = agent.session.id
      if (option === 'ui') {
        try { return { kind: 'success', text: '智慧之泉 · ' + await openPage() } }
        catch (error) { return { kind: 'error', text: '界面启动失败：' + error.message } }
      }
      if (option === 'off') {
        active.delete(id)
        return { kind: 'success', text: '当前会话已退出智慧之泉模式。' }
      }
      if (option) return { kind: 'error', text: '用法：/juche、/juche ui 或 /juche off' }
      active.add(id)
      return { kind: 'success', text: '智慧之泉已启用。输入 /juche ui 可打开复刻界面。' }
    },
  })
}
