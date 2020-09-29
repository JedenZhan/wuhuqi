const app = require('http').createServer()
const webSocket = require('ws')

const wss = new webSocket.Server({
  port: 8080
})

console.log('This server is listening port: 8080')
let socketMaps = {}
let existUserNames = []
wss.on('connection', function (socket) {
    let userName = createNewName();
    socketMaps[socket.id] = {
        name: userName,
        competitor: '',
        currentStep: false,
        isBlack: false
    };


    socket.on('applyGame', function (competitorId) {
        let applyId = socket.id;
        socketMaps[applyId].competitor = competitorId;
        socketMaps[competitorId].competitor = applyId;

        if (parseInt(Math.random() * 100 + 1, 10) % 2 === 0) {
            socketMaps[applyId].currentStep = true;
            socketMaps[applyId].isBlack = true;
        } else {
            socketMaps[competitorId].currentStep = true;
            socketMaps[competitorId].isBlack = true;
        }
        io.to(applyId).emit('beginGame', socketMaps[applyId]);
        io.to(competitorId).emit('beginGame', socketMaps[competitorId]);
    });

    socket.on('step', function (stepInfo) {
        let competitorId = socketMaps[socket.id].competitor;
        let competitor = socketMaps[competitorId];
        competitor.currentStep = true;
        io.to(competitorId).emit('competitorStep', {
            ownInfo: competitor,
            stepInfo: stepInfo
        })
    });

    socket.on('disconnect', function () {
        console.log('disconnect');
        delete socketMaps[socket.id];
    });
});
