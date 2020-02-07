const raml2html = require('raml2html')
const fs = require('fs')
const { promisify } = require('util')
const rmdir = require('rimraf')
const path = require('path')

const readDirAsync = promisify(fs.readdir)
const writeFileAsync = promisify(fs.writeFile)
const mkdirAsync = promisify(fs.mkdir)
const rmdirAsync = promisify(rmdir)

const PRODUCTION = process.env.NODE_ENV === 'production'

const THEME_OPTIONS = {
  logo: './images/logo.png',
  'root-template': './templates/root.nunjucks',
  'language-tabs': ['json']
}

const THEME_DATA = raml2html.getConfigForTheme('raml2html-slate-theme', THEME_OPTIONS)

const CONFIGURATION = {
  apisPath: './apis',
  buildPath: './build',
  defaultApi: 'acl',
  // Validate RAML, but it causes errors currently.
  validate: false
}

const mainIndexRenderData = {
  pages: []
};

(async (config) => {
  const renderHTML = async (api, data) => {
    THEME_DATA.rootTemplateData = data
    return raml2html.render(api, THEME_DATA, { validate: config.validate })
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

  print('Running with configuration:')
  print(config)
  print(THEME_DATA)
  const apis = await readDirAsync(config.apisPath)

  if (fs.existsSync(config.buildPath)) {
    print(`\nResetting build folder: ${config.buildPath}`)
    await rmdirAsync(config.buildPath)
  }

  print('\nAPIs to build documentation for:')

  for await (const [i, api] of apis.entries()) {
    const outputPath = generateBuildPath(api)
    mainIndexRenderData.pages.push({
      name: api,
      label: `${api.charAt(0).toUpperCase() + api.slice(1)} API`,
      outputPath,
      uri: PRODUCTION ? '/' + api : path.resolve(outputPath + '/index.html')
    })
    print(`${i}: ${(api)} -> ${outputPath}`)
  }

  for await (const { name, outputPath } of mainIndexRenderData.pages) {
    print(`\nGenerating documentation for ${name} API ...`)
    const templateData = JSON.parse(JSON.stringify(mainIndexRenderData))
    const ramlPath = generateAPIPath(name, 'api.raml')

    // Set active link
    const foundIndex = templateData.pages.findIndex(p => p.name === name)
    if (templateData.pages[foundIndex]) {
      templateData.pages[foundIndex].active = true
    }

    const html = await renderHTML(ramlPath, templateData)
    await mkdirAsync(outputPath, { recursive: true })
    await writeFileAsync(outputPath + '/index.html', html)

    if (name === config.defaultApi) {
      print(`Setting ${name} as default documentation`)
      await writeFileAsync(config.buildPath + '/index.html', html)
      print(`Path ${config.buildPath} has been successfully built!`)
    }

    print(`Path ${outputPath} has been successfully built!`)
  }

  print('\nPages were built:')
  print(mainIndexRenderData)
  print('\nDone!')
})(CONFIGURATION)
