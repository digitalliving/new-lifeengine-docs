const raml2html = require('raml2html')
const fs = require('fs')
const { promisify } = require('util')
const rmdir = require('rimraf')

const readDirAsync = promisify(fs.readdir)
const writeFileAsync = promisify(fs.writeFile)
const mkdirAsync = promisify(fs.mkdir)
const rmdirAsync = promisify(rmdir)

const THEME_OPTIONS = {
  logo: './images/logo.png',
  // 'color-theme': 'path/to/my/color-theme.styl',
  'root-template': './templates/root.nunjucks',
  'language-tabs': ['json']
}

const THEME = raml2html.getConfigForTheme('raml2html-slate-theme', THEME_OPTIONS)

const CONFIGURATION = {
  apisPath: './apis',
  buildPath: './build',
  // Validate RAML, but it causes errors currently.
  validate: false
}

const mainIndexRenderData = {
  pages: []
};

(async (config) => {
  const renderHTML = async (api) => {
    return raml2html.render(api, THEME, { validate: config.validate })
  }

  const print = (data, method) => {
    if (typeof method !== 'string') {
      method = 'log'
    }
    if (typeof data === 'object') {
      data = JSON.stringify(data, null, 2)
    }

    console[method](data)
  }
  const generateAPIPath = (api, fileName) => {
    return `${config.apisPath}/${api}/docs/${fileName}`
  }

  const generateBuildPath = (api) => {
    return `${config.buildPath}/${api}`
  }

  print('Running with configuration:', 'info')
  print(config)
  const apis = await readDirAsync(config.apisPath)

  if (fs.existsSync(config.buildPath)) {
    print(`\nResetting build folder: ${config.buildPath}`)
    await rmdirAsync(config.buildPath)
  }

  print(`\nFound APIs: ${apis}`)

  for await (const api of apis) {
    print(`\nProcessing ${api} API ...`)

    const ramlPath = generateAPIPath(api, 'api.raml')
    const html = await renderHTML(ramlPath)
    const indexPath = generateBuildPath(api, 'index.html')

    await mkdirAsync(indexPath, { recursive: true })

    await writeFileAsync(indexPath + '/index.html', html)

    mainIndexRenderData.pages.push({ name: api, path: indexPath })

    print(`The file ${indexPath} was saved!`)
  }

  print('\nGenerating main index page ...')

  print('\nDone!')
})(CONFIGURATION)
