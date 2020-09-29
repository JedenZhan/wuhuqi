const webSocket = require('ws'),

  utils = require('./utils')


const { getId, getNewName, stringify, parse, getRandomNum } = utils

const wss = new webSocket.Server({
    port: 8080
})

let finded = false

const playingMap = {}, sparePlayerMap = {}

wss.on('connection', (socket, req) => {
  const socketId = getId(), userName = getNewName()
  socket.id = socketId
  sparePlayerMap[socketId] = { // 根据 id 信息保存玩家数据
    name: userName,
    socket: socket,
    opponent: '',
  }

  function sendMessage(targetSocket, type, data) {
    targetSocket.send(stringify({
      type,
      data
    }))
  }

  function finding(currentId) {
    const playerIdArr = Object.keys(sparePlayerMap), len = playerIdArr.length
    if (len === 2) {
      console.log(playerIdArr)
      const opponentId = playerIdArr[0] == currentId ? playerIdArr[1] : playerIdArr[0]
      playingMap[currentId] = sparePlayerMap[currentId]
      playingMap[opponentId] = sparePlayerMap[opponentId]
      delete sparePlayerMap[currentId], delete sparePlayerMap[opponentId]

      playingMap[currentId].opponent = opponentId
      playingMap[opponentId].opponent = currentId
      finded = true
    } else {
      finded = false
      sendMessage(socket, 'none', {
        message: '当前并无空闲玩家哦...'
      })
    }
  }

  function handleStep(data, socketId) {
    const  { chessesArr, player } = data,
      target = playingMap[playingMap[socketId].opponent]
      targetSocket = target.socket
    sendMessage(targetSocket, 'step1', {
      chessesArr,
      player
    })
  }

  socket.on('message', message => {
    message = parse(message)

    switch (message.type) {
      case 'finding':
        finding(socket.id)
        break
      case 'step1':
        console.log(finded)
        finded && handleStep(message.data, socket.id)
        break
    }
  })

  socket.on('close', message => {
    const socketId = socket.id
    console.log(`${socketId} 链接关闭`)
    delete sparePlayerMap[socketId]
  })
  
  //发送消息
  socket.send('连接已开启')
  socket.send(req.id + '已连接')
})