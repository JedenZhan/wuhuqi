const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

const getDataByPath = (obj, url) => {
  if (!obj) return obj
  const keys = url.split('.') // 把路径转为数组
  let target = obj[keys.shift()]; // 先获取第一个属性
  for (let i = 0, len = keys.length; i < len; i++) {
    let currentKey = keys.shift() // 依次取出属性名
    if (target) {
      target = target[currentKey]
    } else {
      return target // 如果不能再深度取值, 则返回
    }
  }
  return target // 最后走完循环, 也就拿到了我们需要的值
}

const unip = arr => Array.from(new Set(arr))

module.exports = {
  formatTime,
  getDataByPath,
  unip
}
