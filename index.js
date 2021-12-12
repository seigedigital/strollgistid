const express = require('express')
const fetch = import('node-fetch')
const sqlite3 = require('sqlite3').verbose()
const btoa = require('btoa')
const log4js = require('log4js')

const config = require('./config.json')

// globals

var authstring = 'Basic ' + btoa(config.github_username+':'+config.github_pat)

// rate limit control
var rl_remaining = -1
var rl_limit = -1
var rl_used = -1
var rl_rest = -1

// sql statements

const cache_table_definition = `CREATE TABLE IF NOT EXISTS cache (
  id TEXT PRIMARY KEY,
  user TEXT,
  last INTEGER,
  body BLOB
)`

const cache_get_query = `SELECT body, last FROM cache WHERE
  id = ?
`

const cache_store_query = `REPLACE INTO cache(
  id,
  user,
  last,
  body
)
VALUES(?,?,?,?)
`

// FUNCTIONS

// quickly send errors back to the client
function errorout(res,msg,status) {
  res.status(status)
  res.send('{"error":"'+msg+'"}')
  logger.info(msg.toUpperCase())
}

// initial function trying to get data from the cache database
function get(res,id,user) {
  db.get(cache_get_query, [id], (err, row) => {
    if(err) {
      logger.error("CACHE DB ERROR")
      gist_get_meta(res,id,user)
      return
    }
    if(!row) {
      logger.error("DB NO CACHED DATA AVAILABLE")
      gist_get_meta(res,id,user)
      return
    }
    let now = Math.round(Date.now() / 1000)
    let age = parseInt(now)-parseInt(row.last)
    logger.info("SENDING CACHED DATA (AGE "+age+" SEC)")
    res.send(row.body)
    return
  })
}

// save results to the cache database
function store(res,id,user,body) {
  let now = Math.round(Date.now() / 1000)
  db.run(cache_store_query, [id,user,now,body], function(err) {
    if(err) {
      logger.info(err.message)
      return false
    }
    return true
  })
}

function gist_get_meta(res,id,user) {
  let githuburl = 'https://api.github.com/gists/' + id
  let options = {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: authstring,
      'User-agent': 'strollgistid'
    }
  }
  fetch(githuburl,options)
    .then(result => {
      rl_limit = result.headers.get("x-ratelimit-limit")
      rl_remaining = result.headers.get("x-ratelimit-remaining")
      rl_reset = result.headers.get("x-ratelimit-reset")
      rl_used = result.headers.get("x-ratelimit-used")
      let now = Math.round(Date.now() / 1000)
      let rtime = Math.ceil((parseInt(rl_reset)-parseInt(now))/60)
      logger.info("REMAINING RATE: "+rl_remaining+" ("+rl_used+"/"+rl_limit+"), NEXT RESET IN LESS THAN "+rtime+" MIN")
      result.json().then(function(json) {
        let rawurl = false
        try {
          rawurl = json.files.strollview.raw_url
        } catch (e) {
          if(rl_remaining<1) {
            errorout(res,"github api rate limit reached",503)
          } else {
            errorout(res,"error getting raw url",500)
          }
          return
        }
        gist_get_raw(res,id,user,rawurl)
      })
    })
    .catch(err => logger.error(err))
}

function gist_get_raw(res,id,user,rawurl) {
  const options = {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: authstring,
      'User-agent': 'strollgistid'
    }
  }
  fetch(rawurl,options)
    .then(result => result.text())
    .then(body => {
      deliver(res,id,user,body)
    })
    .catch(err => logger.error(err))
}

function deliver(res,id,user,body) {
  logger.info("SENDING FRESH DATA AND UPDATING CACHE")
  store(res,id,user,body)
  res.status(200)
  res.send(body)
  return
}


// configure logger
log4js.configure({
  appenders: {
    svfile: { type: 'file', filename: '/var/log/strollgistid.log' },
    svout: { type: 'stdout' }
  },
  categories: { default: { appenders: ['svfile','svout'], level: 'info' } }
})

const logger = log4js.getLogger()
logger.level = 'INFO'

// init database
const db = new sqlite3.Database('cache.sqlite3')
db.run(cache_table_definition)

// init server
const app = express()


app.all('*', function (req, res, next) {
  logger.info('PROCESSING REQUEST ' + req.path)

  const pathelements = req.path.split('/')
  if (Object.keys(pathelements).length !== 3) {
    logger.warn('MALFORMED URL, SENDING 404')
    res.status(404)
    res.send('{"error":"malformed url"}')
    return
  }

  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', '*')
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.header('Content-Type', 'application/json')

  const user = pathelements[1]
  const id = pathelements[2]

  if (user.length < 3 || id.length < 3) {
    errorout("insufficient IDs",404)
  } else {
    if (req.method === 'OPTIONS') {
      logger.info('OPTIONS REQUEST ANSWERED')
      res.status(200)
      res.send()
    } else {
      if(req.header('X-SV-CACHE-UPDATE') === 'TRUE') {
        gist_get_meta(res,id,user)
      } else {
        get(res,id,user)
      }
    }
  }
})

app.listen(config.port,config.interface)
logger.info('Listening on '+config.interface+":"+config.port)
