const raml2html = require('raml2html')
const fs = require('fs')
const { promisify } = require('util')
const nunjucks = require('nunjucks')

const readDirAsync = promisify(fs.readdir)
const writeFileAsync = promisify(fs.writeFile)

const themeOptions = {
  logo: './images/logo.png',
  // 'color-theme': 'path/to/my/color-theme.styl',
  'language-tabs': ['json']
}

const themeConfig = raml2html.getConfigForTheme('raml2html-slate-theme', themeOptions)

const CONFIGURATION = {
  apisPath: './apis',
  // Validate RAML, but it causes errors currently.
  validate: false,
  mainIndexPagePath: './index.html'
}

const mainIndexRenderData = {
  pages: []
};

(async (config) => {
  const renderHTML = async (api) => {
    return raml2html.render(api, themeConfig, { validate: config.validate })
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
  print('Running with configuration:', 'info')
  print(config)
  const apis = await readDirAsync(config.apisPath)

  print(`\nFound APIs: ${apis}`)

  for await (const api of apis) {
    print(`\nProcessing ${api} API ...`)

    const ramlPath = generateAPIPath(api, 'api.raml')
    const html = await renderHTML(ramlPath)

    const indexPath = generateAPIPath(api, 'index.html')

    await writeFileAsync(indexPath, html)

    mainIndexRenderData.pages.push({ name: api, path: indexPath })

    print(`The file ${indexPath} was saved!`)
  }

  print('\nGenerating main index page ...')
  const indexHtml = nunjucks.render('./index.njk', { mainIndexRenderData })
  await writeFileAsync(config.mainIndexPagePath, indexHtml)
  print(`Index page was save to ${config.mainIndexPagePath}`)

  print('\nDone!')
})(CONFIGURATION)
