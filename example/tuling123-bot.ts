/**
 *
 * Wechaty bot use a Tuling123.com brain
 *
 * Apply your own tuling123.com API_KEY
 * at: http://www.tuling123.com/html/doc/api.html
 *
 * Enjoy!
 *
 * Wechaty - https://github.com/zixia/wechaty
 *
 */
/* tslint:disable:no-var-requires */
/* tslint:disable:variable-name */
const QrcodeTerminal  = require('qrcode-terminal')
const Tuling123       = require('tuling123-client')

import { EventEmitter } from 'events'

import {
    Config
  , Wechaty
  , log
} from '../'

// log.level = 'verbose'
// log.level = 'silly'

/**
 *
 * Apply Your Own Tuling123 Developer API_KEY at:
 * http://www.tuling123.com
 *
 */
const TULING123_API_KEY = '18f25157e0446df58ade098479f74b21'
const brain = new Tuling123(TULING123_API_KEY)

const bot = Wechaty.instance({ profile: Config.DEFAULT_PROFILE })

console.log(`
Welcome to Tuling Wechaty Bot.
Tuling API: http://www.tuling123.com/html/doc/api.html

Notice: This bot will only active in the room which name contains 'wechaty'.
/* if (/Wechaty/i.test(room.get('name'))) { */

Loading...
`)

bot
.on('login'  , user => log.info('Bot', `bot login: ${user}`))
.on('logout' , e => log.info('Bot', 'bot logout.'))
.on('scan', (url, code) => {
  if (!/201|200/.test(String(code))) {
    let loginUrl = url.replace(/\/qrcode\//, '/l/')
    QrcodeTerminal.generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code in above url to login: `)
})
.on('message', async msg => {
  if (msg.self()) return

  try {
    // const msg = await m.load()
    const room = msg.room()

    if (room && /Wechaty/i.test(room.topic())) {
      log.info('Bot', 'talk: %s'  , msg)
      talk(msg)
    } else {
      log.info('Bot', 'recv: %s'  , msg)
    }
  } catch (e) {
    log.error('Bot', 'on message rejected: %s' , e)
  }
})

bot.init()
.catch(e => {
  log.error('Bot', 'init() fail:' + e)
  bot.quit()
  process.exit(-1)
})

class Talker extends EventEmitter {
  private obj: {
    text: any
    time: any
  }
  private timer: number | null

  constructor(private thinker) {
    super()
    log.verbose('Talker()')
    this.obj = {
      text: []
      , time: []
    }
  }

  public save(text) {
    log.verbose('Talker', 'save(%s)', text)
    this.obj.text.push(text)
    this.obj.time.push(Date.now())
  }
  public load() {
    const text = this.obj.text.join(', ')
    log.verbose('Talker', 'load(%s)', text)
    this.obj.text = []
    this.obj.time = []
    return text
  }

  public updateTimer(delayTime?) {
    delayTime = delayTime || this.delayTime()
    log.verbose('Talker', 'updateTimer(%s)', delayTime)

    if (this.timer) { clearTimeout(this.timer) }
    this.timer = setTimeout(this.say.bind(this), delayTime)
  }

  public hear(text) {
    log.verbose('Talker', `hear(${text})`)
    this.save(text)
    this.updateTimer()
  }
  public say() {
    log.verbose('Talker', 'say()')
    const text  = this.load()
    this.thinker(text)
    .then(reply => this.emit('say', reply))
    this.timer = null
  }

  public delayTime() {
    const minDelayTime = 5000
    const maxDelayTime = 15000
    const delayTime = Math.floor(Math.random() * (maxDelayTime - minDelayTime)) + minDelayTime
    return delayTime
  }
}

/* tslint:disable:variable-name */
let talkerList: Talker[] = []

function talk(m) {
  const fromId  = m.from().id
  const roomId =  m.room().id
  const content = m.content()

  const talkerName = fromId + roomId
  if (!talkerList[talkerName]) {
    talkerList[talkerName] = new Talker(function(text) {
      return brain.ask(text, {userid: talkerName})
      .then(r => {
        log.info('Tuling123', 'Talker reply:"%s" for "%s" ', r.text, text)
        return r.text
      })
    })
    talkerList[talkerName].on('say', reply => m.say(reply))
  }
  talkerList[talkerName].hear(content)
}
