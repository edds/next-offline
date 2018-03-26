const { GenerateSW } = require('workbox-webpack-plugin')
const { readDir, readFile } = require('fs-extra')
const { join } = require('path')
const SwGen = require('./plugin')

const Precache = require('./next-files')
// const {generateSW} = require('workbox-build')

module.exports = (nextConfig = {}) => ({
  ...nextConfig,
  async exportPathMap () {
    let basePaths = {}

    if (typeof nextConfig.exportPathMap === 'function')  {
      basePaths = nextConfig.exportPathMap()

      const buildIdPath = join(process.cwd(), '.next', 'BUILD_ID')
      const buildId = await readFile(buildIdPath, 'utf8')
      const { precaches } = await Precache(buildId)
      const urls = precaches.map(({ url }) => url)
      const swDest = 'out/service-worker.js'

      // globDirectory is intentionally left blank as it's required by workbox
      // await generateSW({ swDest, importScripts: urls, globDirectory: ' '})
      // const indexPath = join(process.cwd(), 'out', 'index.html')
      // const index = await readFile(indexPath, 'utf8')
      // console.log(index)
    }

    return basePaths
  },
  webpack (config, options) {
    if (!options.defaultLoaders) {
      throw new Error('This plugin is not compatible with Next.js versions below 5.0.0 https://err.sh/next-plugins/upgrade')
    }

    if (typeof nextConfig.webpack === 'function') {
      config = nextConfig.webpack(config, options)
    }

    if (options.dev || options.isServer) return config

    const {
      dontAutoRegisterSw = false,
      workboxOpts = {
        runtimeCaching: [
          { urlPattern: /^https?.*/, handler: 'networkFirst' }
        ]
      }
    } = nextConfig || config || options

    config.plugins = [
      ...config.plugins,
      // new GenerateSW({ ...workboxOpts }),
      new SwGen({ buildId: options.buildId, ...workboxOpts })
    ]

    const originalEntry = config.entry

    config.entry = async () => {
      const entries = await originalEntry()

      if (entries['main.js'] && !dontAutoRegisterSw) {
        entries['main.js'].unshift(require.resolve('./register-sw.js'))
      }

      return entries
    }

    return config
  }
})
