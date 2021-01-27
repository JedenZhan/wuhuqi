const utils = require("../../utils/util.js"),
  app = getApp(),
  parse = JSON.parse;

Page({
  data: {
    socket: null,
    /* 
      0 as none, 
      1 as red, 
      2 as blue, 
      3 as highlight-red, 
      4 as highlight-blue, 
      5 as highlight-red-space
      6 as highlight-blue-space
    */
    // chessesArr: [
    //   [1, 2, 1, 2, 1],
    //   [2, 2, 1, 2, 2],
    //   [1, 1, 2, 1, 1],
    //   [2, 1, 1, 2, 1],
    //   [1, 2, 1, 1, 2],
    // ],
    chessesArr: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    chessesArrClone: [], // 棋子状态副本
    redNum: 0, // 红方棋子数
    blueNum: 0, // 蓝方棋子数
    player: 1, // 1 as me, 2 as opponent
    highLighting: false,
    addChessNum: 0, // 默认多下 0 个
    deleteChessNum: 0, // 默认删除对方 0 个
    currentStep: 1, // 当前游戏阶段: 1 as 下棋, 2 as delete, 3 as move
    step2ChessNum: 0,
    currentTouchIndex: [],

    // 玩家信息
    mine: {
      id: utils.setUser(),
      userName: "",
      headerUrl: "",
    },
    opponent: {
      username: "对战玩家",
      headerUrl: "",
    },
    // 游戏信息
    redMessage: "test message",
    blueMessage: "test message",
  },
  onLoad(options) {
    const _this = this;
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({
        mine: {
          username: userInfo.nickName,
          headerUrl: userInfo.avatarUrl,
        },
      });
    }

    // const socket = wx.connectSocket({
    //   url: "ws://localhost:8080",
    //   success(res) {
    //     console.log("连接成功", res);
    //   },
    // });

    // socket.onOpen(() => {
    //   _this.setData({
    //     socket,
    //   });
    // });
  },
  onReady() {
    const socket = this.data.socket;

    // wx.showLoading({
    //   title: '正在匹配玩家',
    //   mask: true,
    // })

    this.sendMessage("finding");
  },
  onShow() {
    wx.showToast({
      title: "Step1:下棋",
      duration: 3000,
      icon: "none",
    });

    // -----------------------------------------------socket 处理
    const socket = this.data.socket;

    // -----------------------------------------------------------

    setTimeout(() => {
      this.registerSocket();
    }, 1000);
  },

  registerSocket() {
    // const socket = this.data.socket;
    // socket.onMessage(m => {
    //   let parsedObj = parse(m.data);
    //   let type = parsedObj.type,
    //     data = parsedObj.data;
    //   switch (type) {
    //     case "step1":
    //       this.setData({
    //         chessesArr: data.chessesArr,
    //       });
    //       break;
    //   }
    // });
  },

  sendMessage(type, m) {
    const { socket } = this.data;
    if (socket) {
      socket.send({
        data: JSON.stringify({
          type,
          data: m,
        }),
      });
    } else {
      console.log("no socket");
    }
  },

  setMessage(message) {
    const { player } = this.data;
    if (player === 1) {
      this.setData({
        redMessage: message,
        blueMessage: "",
      });
    } else {
      this.setData({
        blueMessage: message,
        redMessage: "",
      });
    }
  },
  exchangePlayer() {
    let player = this.data.player;
    this.setData({
      player: player === 1 ? 2 : 1,
    });
  },
  onShareAppMessage() {},
  // ---------------------------第三阶段 走子------------------------
  moveChess(e) {
    const [x, y] = e.currentTarget.dataset.chessindex,
      { player, chessesArr, currentTouchIndex, chessesArrClone } = this.data;

    if (player !== chessesArr[x][y] || chessesArr[x][y] === 0) return;
    if (currentTouchIndex.length !== 0) {
      // 说明换了点击棋子
      this.setData({
        chessesArr: chessesArrClone,
      });
    }
    let canMovePositions = this.checkCanMove(x, y);
    if (canMovePositions.length === 0) {
      this.setMessage("抱歉, 当前棋子不可移动");
    }

    this.setData({
      currentTouchIndex: [x, y], // 标记当前点击棋子
    });
  },

  moveToHere(e) {
    const [x, y] = e.currentTarget.dataset.chessindex;
    const { currentTouchIndex, player, chessesArrClone, chessesArr } = this.data;
    chessesArrClone[x][y] = player;
    chessesArrClone[currentTouchIndex[0]][currentTouchIndex[1]] = 0;

    this.setData({
      chessesArr: chessesArrClone,
    });

    const found = this.checkFound(x, y),
      oblique = this.checkOblique(x, y),
      five = this.checkColAndRow(x, y);

    let foundNum = found.foundNum,
      smallOblique = oblique.three,
      middleOblique = oblique.four,
      bigOblique = oblique.five,
      fiveNum = five.colAndRowNum,
      deleteChessNum = foundNum + smallOblique + 2 * middleOblique + 3 * bigOblique + 2 * fiveNum;
    this.setData({
      deleteChessNum,
    });

    // 高亮成项棋子
    const needHighLightChess = [
      ...found.needHighLightChess,
      ...oblique.needHighLightChess,
      ...five.needHighLightChess,
    ];
    this.highLightChess(...needHighLightChess);

    if (this.data.deleteChessNum > 0) {
      this.setMessage(`根据成项规则, 您可以拿掉对方 ${deleteChessNum} 个棋子`);
      this.startDeleteChess(deleteChessNum);
    } else {
      this.exchangePlayer();
    }
  },

  startDeleteChess(num) {
    if (num <= 0) return;
    const { player, chessesArr } = this.data;

    this.setData({
      currentStep: 4,
    });
  },

  // -------------------------成项删除对方棋子
  deleteOpponentChess(e) {
    if (this.data.highLighting) return;
    const [x, y] = e.currentTarget.dataset.chessindex;
    let { chessesArr, player, deleteChessNum, redNum, blueNum } = this.data;

    if (player === chessesArr[x][y]) {
      this.setMessage("这是你的棋子...");
      return;
    } else {
      wx.showModal({
        title: "确定删除对方的这一个嘛 ?",
        content: "取消以返回",
        success: e => {
          if (e.confirm) {
            player === 1 && --blueNum;
            player === 2 && --redNum;
            chessesArr[x][y] = 0;
            this.setData({
              chessesArr,
              deleteChessNum: --deleteChessNum,
              redNum,
              blueNum,
            });
          }
          if (this.data.deleteChessNum === 0) {
            this.setMessage("删除机会用完啦");
            this.setData({
              player: player === 1 ? 2 : 1,
              currentStep: 3, // 继续第三阶段
            });
          }
          if (redNum < 3) {
            this.setMessage("火龙果输啦");
          } else if (blueNum < 3) {
            this.setMessage("火龙果赢啦");
          }
        },
      });
    }
  },
  // 检查是否可以移动
  checkCanMove(x, y) {
    const { chessesArr, highLighting } = this.data,
      needToCheck = {},
      needHighLight = [];

    if (chessesArr[x][y] === 0 || highLighting) return [];
    needToCheck.top = chessesArr[x - 1] && chessesArr[x - 1][y];
    needToCheck.left = chessesArr[x][y - 1];
    needToCheck.bottom = chessesArr[x + 1] && chessesArr[x + 1][y];
    needToCheck.right = chessesArr[x][y + 1];

    for (let item in needToCheck) {
      if (needToCheck[item] !== 0) continue;
      switch (item) {
        case "top":
          needHighLight.push([x - 1, y]);
          break;
        case "left":
          needHighLight.push([x, y - 1]);
          break;
        case "bottom":
          needHighLight.push([x + 1, y]);
          break;
        case "right":
          needHighLight.push([x, y + 1]);
      }
    }
    this.highLightSpace(...needHighLight);
    return needHighLight;
  },

  highLightSpace(...positions) {
    const originChessesArr = [],
      { chessesArr, player } = this.data;

    chessesArr.forEach(item => originChessesArr.push([...item]));

    positions.forEach(item => {
      const x = item[0],
        y = item[1];

      player === 1 && (originChessesArr[x][y] = 5);
      player === 2 && (originChessesArr[x][y] = 6);
    });

    this.setData({
      chessesArr: originChessesArr,
      chessesArrClone: chessesArr,
    });
  },
  // --------------------------逼子(拿掉对方一个)-------------------------
  removeOne(e) {
    const currentStep = this.data.currentStep;
    if (currentStep === 4) this.deleteOpponentChess(e);
    if (currentStep !== 2) return;
    const [x, y] = e.currentTarget.dataset.chessindex;
    let { chessesArr, player, step2ChessNum, redNum, blueNum } = this.data;

    if (this.data.player === chessesArr[x][y]) {
      this.setMessage("这是你的棋子...");
      return;
    } else {
      wx.showModal({
        title: "确定删除对方的这一个嘛 ?",
        content: "取消以返回",
        success: e => {
          if (e.confirm) {
            chessesArr[x][y] = 0;
            player === 1 && --blueNum;
            player === 2 && --redNum;
            this.setData({
              chessesArr,
              player: player === 1 ? 2 : 1,
              step2ChessNum: ++step2ChessNum,
              redNum,
              blueNum,
            });
          }
          if (this.data.step2ChessNum === 2) {
            wx.showToast({
              title: "Step3: 走子阶段",
              icon: "none",
            });
            this.setData({
              player: 1,
              currentStep: 3, // 到达第三阶段
            });
          }
        },
      });
    }
  },

  // ----------------------------------下棋---------------------------------------
  checkoutChess(e) {
    // 下棋操作
    const { currentStep, player, socket } = this.data;
    if (currentStep === 3) {
      this.moveChess(e);
      return;
    } // 因为微信只能绑定一个方法....这样代理吧
    if (currentStep === 2) {
      this.setMessage("进入第二阶段啦, 长按删除即可");
      return;
    }
    if (currentStep === 4) return;

    const chessIndex = e.currentTarget.dataset.chessindex,
      x = chessIndex[0],
      y = chessIndex[1],
      currentChessArr = [...this.data.chessesArr];
    let { redNum, blueNum } = this.data;
    if (currentChessArr[x][y] !== 0 || this.data.highLighting) return;

    if (player === 1) {
      currentChessArr[chessIndex[0]][chessIndex[1]] = 1;
      redNum++;
    } else {
      currentChessArr[chessIndex[0]][chessIndex[1]] = 2;
      blueNum++;
    }
    this.setData({
      chessesArr: currentChessArr,
      redNum,
      blueNum,
    });
    if (redNum + blueNum === 25) {
      this.setData({
        currentStep: 2,
        player: 1,
      });
      wx.showToast({
        title: "Step1 结束",
        icon: "none",
        duration: 3000,
        complete: () => {
          wx.showToast({
            title: "Step2:逼子, 拿掉对方一个, 火龙果先拿",
            icon: "none",
            duration: 3000,
          });
        },
        mask: true,
      });
      return;
    }

    this.sendMessage("step1", {
      chessesArr: this.data.chessesArr,
      player,
    });
    // 落完子检查
    let found = this.checkFound(x, y); // 方
    let oblique = this.checkOblique(x, y); // 斜
    let five = this.checkColAndRow(x, y); // 横竖

    // 取出应该高亮的棋子
    const needHighLightChess = [
      ...found.needHighLightChess,
      ...oblique.needHighLightChess,
      ...five.needHighLightChess,
    ];
    this.highLightChess(...needHighLightChess);

    // 根据形成的规则决定下一局是谁
    let foundNum = found.foundNum,
      smallOblique = oblique.three,
      middleOblique = oblique.four,
      bigOblique = oblique.five,
      fiveNum = five.colAndRowNum,
      currentRestNum = this.data.addChessNum; // 当前剩余
    this.setData({
      addChessNum:
        currentRestNum + foundNum + smallOblique + 2 * middleOblique + 3 * bigOblique + 2 * fiveNum,
    });

    this.data.addChessNum > 0 && this.setMessage(`您可以多下 ${this.data.addChessNum} 个棋子`);

    let thisPlayer = this.data.player,
      addChessNum = this.data.addChessNum,
      nextPlayer = thisPlayer === 1 ? 2 : 1; // 下一个玩家
    if (addChessNum > 0) {
      this.setData({
        player: thisPlayer,
        addChessNum: --addChessNum,
      });
    } else {
      this.setData({
        player: nextPlayer,
      });
    }
  },

  // 高亮棋子
  highLightChess(...positions) {
    // 初始数组 deepclone 一份
    if (positions.length < 3) return;
    const originChessesArr = [],
      chessesArr = this.data.chessesArr;
    this.data.chessesArr.forEach(item => originChessesArr.push([...item]));

    positions.forEach(item => {
      let x = item[0],
        y = item[1];

      this.data.player === 1 && (originChessesArr[x][y] = 3);
      this.data.player === 2 && (originChessesArr[x][y] = 4);
    });

    this.setData({
      chessesArr: originChessesArr,
      highLighting: true,
    });

    // 高亮 1.5s 恢复
    setTimeout(() => {
      this.setData({
        chessesArr: chessesArr,
        highLighting: false,
      });
    }, 1500);

    return true;
  },

  // -----------------------------检测函数-----------------------------------------------
  checkFound(x, y) {
    let currentChessArr = this.data.chessesArr,
      foundNum = 0; // 成方个数
    const needToCheck = {
        top: [x - 1, y],
        left: [x, y - 1],
        bottom: [x + 1, y],
        right: [x, y + 1],
        topLeft: [x - 1, y - 1],
        leftBottom: [x + 1, y - 1],
        bottomRight: [x + 1, y + 1],
        rightTop: [x - 1, y + 1],
      },
      needHighLightChess = [];
    const index = currentChessArr[x][y]; // 中心位置

    Object.keys(needToCheck).forEach(item => {
      let x = needToCheck[item][0],
        y = needToCheck[item][1];
      needToCheck[item] = currentChessArr[x] && currentChessArr[x][y];
    });

    index === needToCheck.top &&
      index === needToCheck.topLeft &&
      index === needToCheck.left &&
      needHighLightChess.push([x - 1, y], [x - 1, y - 1], [x, y - 1], [x, y]) &&
      foundNum++;

    index === needToCheck.left &&
      index === needToCheck.leftBottom &&
      index === needToCheck.bottom &&
      needHighLightChess.push([x, y - 1], [x + 1, y - 1], [x + 1, y], [x, y]) &&
      foundNum++;

    index === needToCheck.bottom &&
      index === needToCheck.bottomRight &&
      index === needToCheck.right &&
      needHighLightChess.push([x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]) &&
      foundNum++;

    index === needToCheck.right &&
      index === needToCheck.rightTop &&
      index === needToCheck.top &&
      needHighLightChess.push([x, y + 1], [x - 1, y + 1], [x - 1, y], [x, y]) &&
      foundNum++;

    return {
      foundNum,
      needHighLightChess,
    };
  },
  checkOblique(x, y) {
    // 小斜, 大斜, 大通
    const currentChessArr = this.data.chessesArr;
    let index = currentChessArr[x][y];

    // 根据落点斜着向四面扩
    const needToCheck = {
        topLeft: [x - 1, y - 1],
        leftBottom: [x + 1, y - 1],
        bottomRight: [x + 1, y + 1],
        rightTop: [x - 1, y + 1],
      },
      needHighLightChess = [];

    let result = 0,
      three = 0,
      four = 0,
      five = 0;

    Object.keys(needToCheck).forEach(item => {
      let x = needToCheck[item][0],
        y = needToCheck[item][1];
      needToCheck[item] = currentChessArr[x] && currentChessArr[x][y];
    });

    let needToHighLightArr = []; // 一共需要高亮的元素

    // 检查左向
    let start = 1, // 初始偏值
      rightTopOffset = 0, // 向上偏移值
      leftBottomOffset = 0,
      rightTop = false, // 右上是否打通
      leftBottom = false, // 左下是否打通
      rightTopArr = [[x, y]], // 右上的数组
      leftBottomArr = [];
    // 右上
    while (true) {
      if (needToCheck.rightTop === undefined) {
        rightTopOffset = 1;
        rightTop = true;
        break;
      }
      if (index !== needToCheck.rightTop) break;

      rightTopArr.push([x - start, y + start]);
      ++start;
      needToCheck.rightTop = currentChessArr[x - start] && currentChessArr[x - start][y + start];

      if (needToCheck.rightTop === undefined) {
        // 说明打通
        rightTop = true;
        rightTopOffset = start;
        break;
      }
    }
    // 左下
    start = 1; // 右上检查完毕, 重置偏值
    while (true) {
      if (needToCheck.leftBottom === undefined) {
        leftBottom = true;
        leftBottomOffset = 1;
        break;
      }
      if (index !== needToCheck.leftBottom) break;

      leftBottomArr.push([x + start, y - start]);
      ++start;
      needToCheck.leftBottom = currentChessArr[x + start] && currentChessArr[x + start][y - start];
      if (needToCheck.leftBottom === undefined) {
        // 说明打通
        leftBottom = true;
        leftBottomOffset = start;
        break;
      }
    }

    start = 1; // 左向检查完毕, 重置偏值
    // 检查右向
    let topLeft = false,
      bottomRight = false,
      topLeftOffset = 0,
      bottomRightOffset = 0,
      topLeftArr = [[x, y]],
      bottomRightArr = [];
    // 左上
    while (true) {
      if (needToCheck.topLeft === undefined) {
        topLeftOffset = 1;
        topLeft = true;
        break;
      }
      if (index !== needToCheck.topLeft) break;

      topLeftArr.push([x - start, y - start]);
      ++start;
      needToCheck.topLeft = currentChessArr[x - start] && currentChessArr[x - start][y - start];
      if (needToCheck.topLeft === undefined) {
        // 说明打通
        topLeft = true;
        topLeftOffset = start;
        break;
      }
    }

    start = 1;
    // 右下
    while (true) {
      if (needToCheck.bottomRight === undefined) {
        bottomRight = true;
        bottomRightOffset = 1;
        break;
      }
      if (index !== needToCheck.bottomRight) break;

      bottomRightArr.push([x + start, y + start]);
      ++start;
      needToCheck.bottomRight = currentChessArr[x + start] && currentChessArr[x + start][y + start];
      if (needToCheck.bottomRight === undefined) {
        // 说明打通
        bottomRight = true;
        bottomRightOffset = start;
        break;
      }
    }
    if (rightTop && leftBottom) {
      let type = rightTopOffset + leftBottomOffset - 1;
      type === 3 && three++;
      type === 4 && four++;
      type === 5 && five++;
      type > 2 && needHighLightChess.push(...rightTopArr, ...leftBottomArr);
    }

    if (topLeft && bottomRight) {
      let type = topLeftOffset + bottomRightOffset - 1;
      type === 3 && three++;
      type === 4 && four++;
      type === 5 && five++;
      type > 2 && needHighLightChess.push(...topLeftArr, ...bottomRightArr);
    }

    return {
      three,
      four,
      five,
      needHighLightChess,
    };
  },

  checkColAndRow(x, y) {
    // 五通
    const currentChessArr = this.data.chessesArr,
      row = currentChessArr[x],
      col = [],
      needHighLightChess = [];
    let colAndRowNum = 0;
    for (let i = 0; i < 5; i++) {
      col.push(currentChessArr[i][y]);
    }

    if (utils.unip(row).length === 1) {
      needHighLightChess.push([x, 0], [x, 1], [x, 2], [x, 3], [x, 4]);
      colAndRowNum++;
    }
    if (utils.unip(col).length === 1) {
      needHighLightChess.push([0, y], [1, y], [2, y], [3, y], [4, y]);
      colAndRowNum++;
    }
    return {
      colAndRowNum,
      needHighLightChess,
    };
  },
});
