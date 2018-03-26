const { writeFile } = require('fs-extra')
const { join } = require('path')
const { generateSW } = require('workbox-build');
const nextFiles = require('./next-files.js')

module.exports = class NextFilePrecacherPlugin {
  constructor (opts) {
    this.opts = {
      filename: 'service-worker.js',
      ...opts
    }
  }

  apply (compiler) {
    compiler.plugin('after-emit', (compilation, callback) => {
      this.opts.filename = join(compiler.options.output.path, this.opts.filename)
      this.opts.outputPath = compiler.options.output.path

      callback()
    })

    compiler.plugin('done', async () => {
      const manifest = await nextFiles(this.opts.buildId)
      const cwd = process.cwd()
      // const genSw = await fs.readFile(join(this.opts.outputPath, 'service-worker.js')
      // join(this.opts.outputPath, 'service-worker.js'), 'utf8')

      // const newSw =
      //   `self.__precacheManifest = ${JSON.stringify(manifest.precaches, null, 2)}`
      //   + '\n'
      //   + genSw.replace(genSw.match(/"precache-manifest.*/)[0], '')

      const urls = manifest.precaches.map(({ url }) => url)
      const swDest = join(this.opts.outputPath, 'service-worker.js')

      const manifestEntries = `self.__precacheManifest = ${JSON.stringify(manifest.precaches, null, 2)}`
      const manifestFilename = `manifest-entries.${this.opts.buildId}.js`
      const manifestFilePath = join('static', manifestFilename)

      await writeFile(manifestFilePath, manifestEntries, 'utf8')
      console.log(this.opts)
      await generateSW({ swDest, importScripts: [`/${manifestFilePath}`], globDirectory: ' ', ...this.opts})
    }, err => {
      throw new Error(`Precached failed: ${err.toString()}`)
    })
  }
}
