const { createWorker } = require('tesseract.js')
const fs = require('fs')
const fetch = require('node-fetch')

console.log(process.pwd)
const worker = createWorker()
module.exports = async function ocr(captchaUrl) {
  const filename = 'preview.png'
  const pic = await fetch(captchaUrl)
  await pic.body.pipe(fs.createWriteStream(filename)).on('finish', () => {
    console.log('Downloading captcha')
  })
  await worker.load()
  await worker.loadLanguage('eng')
  await worker.initialize('eng')
  const {
    data: { text },
  } = await worker.recognize(filename)
  await worker.terminate()
  return text.slice(0, 4)
}
