#!/usr/bin/env node
const Conf = require('conf')
const fetch = require('node-fetch')
const yaml = require('js-yaml')
const fs = require('fs')
const log = require('./interface/colorLog')
const { prompt } = require('inquirer')
const conf = new Conf()

let school = conf.get('school')

class User {
  constructor(config) {
    this.conf = config
    this.selectType = null
  }

  async loadUserFormFile(path) {
    let users = this.conf.get('users')
    if (!users) users = []
    let loadedUsers
    try {
      const doc = yaml.safeLoad(fs.readFileSync(path, 'utf8'))
      loadedUsers = doc
    } catch (e) {
      console.log(e)
    }
    this.conf.set('users', [...new Set([...loadedUsers, ...users])])
    log.object(this.conf.get('users'))
  }

  async load() {
    const users = this.conf.get('users')
    const questions = [
      {
        type: 'list',
        name: 'type',
        message: `用户编辑: ${
          school ? ' 学校信息已成功配置' : ' 学校信息未配置'
        }\n  已有用户：${users.reduce((s, e) => {
          const userInfo = e.alias || e.username
          return ' ' + userInfo
        }, '')}`,
        choices: [
          {
            value: 1,
            name: '添加用户',
          },
          {
            value: 2,
            name: '删除用户',
          },

          {
            value: -1,
            name: '取消',
          },
        ],
      },
    ]

    const res = await prompt(questions)
    this.selectType = res.type
  }

  async createUser() {
    const users = this.conf.get('users')
    const questions = [
      {
        type: 'input',
        name: 'username',
        message: '请输入用户名',
      },
      {
        type: 'input',
        name: 'password',
        message: '请输入密码',
      },
      {
        type: 'input',
        name: 'alias',
        message: '(可选)请输入用户别名',
      },
    ]

    const res = await prompt(questions)

    if (!users.some(e => e.username === res.username)) {
      const addUser = {
        username: res.username,
        password: res.password,
        alias: res.alias || null,
      }
      this.conf.set('users', [addUser, ...users])
      log.success('🎉 成功添加用户', addUser)
    } else {
      log.error('🙃 用户已存在')
    }
  }

  async deleteUser() {
    const users = this.conf.get('users')
    const questions = [
      {
        type: 'list',
        name: 'selection',
        message: '请选择删除对象:',
        choices: [
          ...users.map((e, idx) => ({
            value: idx,
            name: `${e.alias || e.user.name}`,
          })),
          {
            value: -1,
            name: '取消',
          },
        ],
      },
    ]

    const res = await prompt(questions)
    const delUser = {
      username: res.username,
      password: res.password,
      alias: res.alias || null,
    }

    this.conf.set('users', [delUser, ...users])
    log.success('🎉 成功删除用户', delUser.alias)
  }
}

class School {
  constructor(conf) {
    this.conf = conf
  }

  async init() {
    if (!school) {
      this.conf.set('school', {})
      const questions = [
        {
          type: 'input',
          name: 'ids',
          message: '请输入学校英文简称',
        },
      ]

      let res = await prompt(questions)
      try {
        res = await fetch(
          `https://mobile.campushoy.com/v6/config/guest/tenant/info?ids=${res.ids}`
        )

        res = await JSON.parse(await res.text())
        const campusphere = `${new URL(res.data[0].ampUrl).origin}/portal/login`
        school = {
          campusphere,
          login: `${res.data[0].idsUrl}/login?service=${encodeURIComponent(
            campusphere
          )}`,
        }

        this.conf.set('school', school)
        log.success(`您的学校 ${res.data[0].name} 已完成设定`)
        log.object(school)
      } catch (e) {
        log.error('API internal error')
      }
    } else {
      log.warning('学校信息已配置')
    }
    return school
  }
}

;(async () => {
  if (!process.argv[2]) process.argv[2] = ''
  if (process.argv[2].match(/(-u|--user)/)) {
    //this.conf.delete('users')
    const userUlti = new User(conf)
    userUlti.loadUserFormFile('./userConf.yml')
    await userUlti.load()
    const type = userUlti.selectType
    log.object(type)
    if (type === 1) userUlti.createUser()
    if (type === 2) userUlti.deleteUser()
  }
  if (process.argv[2].match(/(-s|--school)/)) {
    school = new School(conf).init()
  }
})()

module.exports = conf
