module.exports = {
  getId () {
    return Math.floor(Math.random() * 1000000000)
  },
  getNewName () {
    return 'user' + parseInt(Math.random() * 10000 + 1, 10)
  },
  getRandomNum (len) {
    return Math.floor(Math.random() * len)
  },
  stringify (e) {
    return JSON.stringify(e)
  },
  parse (e) {
    return JSON.parse(e)
  }
}