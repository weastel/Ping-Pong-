var list  = [-1,1];

var speedConstant = list[Math.floor(2*Math.random())];
// Generate random chat hash if needed
if (!location.hash) {
  location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const chatHash = location.hash.substring(1);

// TODO: Replace with your own channel ID
const drone = new ScaleDrone('yiS12Ts5RdNhebyM');
// Scaledrone room name needs to be prefixed with 'observable-'
const roomName = 'observable-' + chatHash;
// Scaledrone room used for signaling
let room;

const configuration = {
  iceServers: [{
    url: 'stun:stun.l.google.com:19302'
  }]
};
// RTCPeerConnection
let pc;
// RTCDataChannel
let dataChannel;

// Wait for Scaledrone signalling server to connect
drone.on('open', error => {
  if (error) {
    return console.error(error);
  }
  room = drone.subscribe(roomName);
  room.on('open', error => {
    if (error) {
      return console.error(error);
    }
    console.log('Connected to signaling server');
  });
  // We're connected to the room and received an array of 'members'
  // connected to the room (including us). Signaling server is ready.
  room.on('members', members => {
    if (members.length >= 3) {
      return alert('The room is full');
    }
    // If we are the second user to connect to the room we will be creating the offer
    const isOfferer = members.length === 2;
    startWebRTC(isOfferer);
  });
});

// Send signaling data via Scaledrone
function sendSignalingMessage(message) {
  drone.publish({
    room: roomName,
    message
  });
}

function startWebRTC(isOfferer) {
  console.log('Starting WebRTC in as', isOfferer ? 'offerer' : 'waiter');
  pc = new RTCPeerConnection(configuration);

  // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
  // message to the other peer through the signaling server
  pc.onicecandidate = event => {
    if (event.candidate) {
      sendSignalingMessage({'candidate': event.candidate});
    }
  };


  if (isOfferer) {
    // If user is offerer let them create a negotiation offer and set up the data channel
    pc.onnegotiationneeded = () => {
      pc.createOffer(localDescCreated, error => console.error(error));
    }
    dataChannel = pc.createDataChannel('chat');
    setupDataChannel();

  } else {
    // If user is not the offerer let wait for a data channel
    pc.ondatachannel = event => {
      dataChannel = event.channel;
      setupDataChannel();
    }
  }

  startListentingToSignals();
}



function startListentingToSignals() {
  // Listen to signaling data from Scaledrone
  room.on('data', (message, client) => {
    // Message was sent by us
    if (client.id === drone.clientId) {
      return;
    }
    if (message.sdp) {
      // This is called after receiving an offer or answer from another peer
      pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
        console.log('pc.remoteDescription.type', pc.remoteDescription.type);
        // When receiving an offer lets answer it
        if (pc.remoteDescription.type === 'offer') {
          console.log('Answering offer');
          pc.createAnswer(localDescCreated, error => console.error(error));
        }
      }, error => console.error(error));
    } else if (message.candidate) {
      // Add the new ICE candidate to our connections remote description
      pc.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
  });
}

function localDescCreated(desc) {
  pc.setLocalDescription(
    desc,
    () => sendSignalingMessage({'sdp': pc.localDescription}),
    error => console.error(error)
  );
}

var opponentPermissions;


// Hook up data channel event handlers
function setupDataChannel() {
  checkDataChannelState();
  dataChannel.onopen = checkDataChannelState;
  dataChannel.onclose = checkDataChannelState;
  dataChannel.onmessage = event =>{
    console.log(JSON.parse(event.data).yPosition);
    com.y = JSON.parse(event.data).yPosition;
    console.log(event);
    if(JSON.parse(event.data).permissions != undefined)
    {
      opponentPermissions = JSON.parse(event.data).permissions;
    }
    document.getElementById('permissions').innerText = opponentPermissions;

    if(JSON.parse(event.data).speedConstant === speedConstant )
    {
      alert("Use another link");
    }
    if(permissions.permissions == opponentPermissions && opponentPermissions == "start")
    {
      startGame();
    }

    if(permissions.permissions == opponentPermissions && opponentPermissions == "pause")
    {
      pauseGame();
    }

    if(permissions.permissions == opponentPermissions && opponentPermissions == "reset")
    {
      ResetGame();
    }

  }
}



function checkDataChannelState() {
  console.log('WebRTC channel state is:', dataChannel.readyState);

}



//game processing

const canvas = document.getElementById('pong');
const context  = canvas.getContext("2d");
//user paddle
const user = {
  x: 0,
  y:canvas.height/2 - 100/2,
  width:10,
  height:100,
  color:"white",
  score:0,
}

//com paddle
const com = {
  x: canvas.width - 10,
  y:canvas.height/2 - 100/2,
  width:10,
  height:100,
  color:"white",
  score:0,
}

//create ball
const ball = {
  x:canvas.width/2,
  y:canvas.height/2,
  radius:10,
  speed:5,
  velocityX:5*speedConstant,
  velocityY:5,
  color:"white"
}
//draw Rect function
function drawRect(x,y,w,h,color) {
  context.fillStyle = color;
  context.fillRect(x,y,w,h);

}

drawRect(0,0,canvas.width,canvas.height,"black");
// draw circle function

function drawCircle(x,y,r,color)
{
  context.fillStyle = color;
  context.beginPath();
  context.arc(x,y,r,0,Math.PI*2,false);
  context.closePath();
  context.fill();
}

const net = {
  x:canvas.width/2 - 1,
  y:0,
  width:2,
  height:10,
  color:"white"
}

//draw net
function drawNet() {
  for(let i =0;i<=canvas.height;i+=15)
  {
    drawRect(net.x,i,net.width,net.height,net.color);
  }
}
// draw text function

function drawText(text,x,y,color) {
  context.fillStyle = color;
  context.font = "45px fantasy";
  context.fillText(text,x,y);
}

//control paddle

canvas.addEventListener("mousemove",movePaddle);

var data;




function movePaddle(evt){
  var rect = canvas.getBoundingClientRect();

  user.y = evt.clientY - rect.top - user.height/2;

    data = {
      yPosition : user.y,
    };

    dataChannel.send(JSON.stringify(data));



}

function render() {
  //clear canvas
  drawRect(0,0,canvas.width,canvas.height,"black");

  //draw net
  drawNet();

  //draw score
  drawText(user.score,canvas.width/4,canvas.height/5,"white");
  drawText(com.score,3*canvas.width/4,canvas.height/5,"white");

  //draw paddle

  drawRect(user.x,user.y,user.width,user.height,user.color);
  drawRect(com.x,com.y,com.width,com.height,com.color);

  //draw the ball
  drawCircle(ball.x,ball.y,ball.radius,ball.color);
}

function collision(b,p){
  b.top = b.y - b.radius;
  b.bottom = b.y + b.radius;
  b.left = b.x - b.radius;
  b.right = b.x + b.radius;

  p.top = p.y;
  p.bottom = p.y + p.height;
  p.left = p.x;
  p.right = p.x + p.width;

  return b.right > p.left && b.bottom > p.top && b.left < p.right && b.top <p.bottom;
}

function resetBall()
{
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2 ;
  ball.speed = 5;
  ball.velocityX = -ball.velocityX;
}
function resetBallComletely()
{
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2 ;
  ball.speed = 5*Math.sqrt(2);
  ball.velocityX = 5*speedConstant;
  ball.velocityY = 5;
}

function update() {
  ball.x += ball.velocityX;
  ball.y += ball.velocityY;



  if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
    ball.velocityY = -ball.velocityY;

  }

  let player = (ball.x<canvas.width/2)? user:com;

  if (collision(ball,player)) {
    //where the ball hit the player
    let collidePoint = ball.y - (player.y + player.height/2);
    collidePoint = collidePoint/(player.height/2);

    let angleRad = collidePoint*Math.PI/4;

    let direction = (ball.x < canvas.width/2) ? 1*speedConstant:-1*speedConstant;

    ball.velocityX = direction * ball.speed * Math.cos(angleRad)*speedConstant;
    ball.velocityY = ball.speed * Math.sin(angleRad);

    ball.speed += 0.1;


  }

  if(ball.x - ball.radius < 0)
  {
    com.score++;
    document.querySelector("body").classList.add("red-glow");
    setTimeout(function(){
      document.querySelector("body").classList.remove("red-glow");
    },1000)
    resetBall();
  }
  else if(ball.x + ball.radius>canvas.width)
  {
    user.score++;
    document.querySelector("body").classList.add("green-glow");
    setTimeout(function(){
      document.querySelector("body").classList.remove("green-glow");
    },1000)
    resetBall();
  }
  if(user.score === 10)
  {
      ResetGame();
      document.querySelector(".status").innerHTML = "User has  won the game";

  }
  else if (com.score === 10 ) {

        ResetGame();
        document.querySelector(".status").innerHTML = "Com has  won the game,you lose";


  }


}

var gameStatus;
var startCheck = false;

function game(){
  update();
  render();
}


function startGame() {
    if(!startCheck)
    {
    document.querySelector('.status').innerHTML = "Game has been started";
    gameStatus = setInterval(game,1000/50);
    startCheck = true;
    }
}

function pauseGame()
{
  console.log("Game has been paused");
  clearInterval(gameStatus);
  if(startCheck)
  {
    document.querySelector(".status").innerHTML = "Game has been paused";
    startCheck = false;
  }
}



function ResetGame()
{
  console.log("Game is been resetted");
  user.score = 0;
  com.score = 0;
  if(startCheck)
  {
    document.querySelector(".status").innerHTML = "Game has been resetted";
    startCheck = false;
  }
  //paddle should be resetted
  user.y = canvas.height/2 - 100/2;
  com.y = canvas.height/2 - 100/2;

  resetBallComletely();
  clearInterval(gameStatus);
  render();

}


render();
document.getElementById('pauseButton').addEventListener("click",pausePermissions);
document.getElementById("startBtn").addEventListener("click",startPermissions);
document.getElementById("ResetButton").addEventListener("click",resetPermissions);

var permissions;

function pausePermissions() {
  permissions={
    permissions:'pause',
      yPosition : user.y,

  }
  if(opponentPermissions == 'pause')
  {
    pauseGame();
  }
  dataChannel.send(JSON.stringify(permissions));
}

function startPermissions() {

  

  permissions = {
    permissions:'start',
    speedConstant: speedConstant,
    yPosition : user.y,
    }
  if(opponentPermissions == 'start')
  {
    startGame();
  }
  dataChannel.send(JSON.stringify(permissions));
}

function resetPermissions() {
  permissions={
    permissions:'reset',
      yPosition : user.y,

  }

  if (opponentPermissions == 'reset') {
    ResetGame();
  }

  dataChannel.send(JSON.stringify(permissions));
}
