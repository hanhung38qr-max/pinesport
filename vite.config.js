import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import fs from 'fs'
import path from 'path'

// MediaPipe 资源放 public/：uni dev 冷启动扫描 src/static 的子目录会 EISDIR 崩溃，
// 而 vite dev 会服务 public/。但 uni build 不把 public/ 拷进 dist，故用插件在
// build 结束后手动拷贝，保证正式产物里模型/wasm 依然本地可用（零下载）。
function copyPublicAssets() {
  return {
    name: 'copy-public-assets',
    apply: 'build',
    closeBundle() {
      const from = path.resolve(process.cwd(), 'public')
      if (!fs.existsSync(from)) return
      const outDir = path.resolve(process.cwd(), 'dist/build/h5')
      for (const name of fs.readdirSync(from)) {
        const src = path.join(from, name)
        const dst = path.join(outDir, name)
        try {
          fs.cpSync(src, dst, { recursive: true })
          console.log(`[copy-public-assets] ${name} -> ${dst}`)
        } catch (e) {
          console.error(`[copy-public-assets] failed ${name}`, e)
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [
    uni(),
    copyPublicAssets()
  ],
})
