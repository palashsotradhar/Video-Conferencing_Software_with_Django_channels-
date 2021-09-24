console.log("hwllow world")
var mapPeers = {};


var usernameInput = document.querySelector('#username');
var btnjoin = document.querySelector('#btn-join');
console.log(usernameInput)

var username;

var webSocket;
function webSocketOnMessage(event){
  var parsedData = JSON.parse(event.data);
  var peerUsername = parsedData['peer'];
  var action = parsedData['action'];
  console.log(peerUsername);
  console.log(action);
  if(username == peerUsername){
    console.log('its on under peer user name')
    return;
  }
  var receiver_channel_name = parsedData['message']['receiver_channel_name'];
  if(action == 'new-peer'){
    console.log('under if action-new peer')
    createOfferer(peerUsername,receiver_channel_name);
    return;
  }
  if(action == 'new-offer'){
    var offer = parsedData['message']['sdp']
    createAnswerer(offer,peerUsername,receiver_channel_name);
  }
  if(action == 'new-answer'){
    var answer = parsedData['message']['sdp'];
    var peer = mapPeers[peerUsername][0];
    peer.setRemoteDescription(answer);
    return;
  }
  // console.log('message :',message);
}

btnjoin.addEventListener('click',() =>{
  console.log("button was clicked")
  username = usernameInput.value;
  console.log('username:',username);
  if(username == ''){
    return;
  }
  usernameInput.value = '';
  usernameInput.disabled = true;
  usernameInput.style.visibility = 'hidden';

  btnjoin.disabled = true;
  btnjoin.style.visibility = 'hidden';

  var labelUsername = document.querySelector('#label-username');
  labelUsername.innerHTML = username;

  var loc = window.location;
  var wsStart = 'ws://';
  if(loc.protocol == 'https:'){
  wsStart = 'wss://'
  }
  var endpoint = wsStart + loc.host + loc.pathname;
  console.log('endpoint:',endpoint);
  webSocket = new WebSocket(endpoint);

  webSocket.addEventListener('open',(e) => {
    console.log('Connection Oppened');
    // var jsonStr = JSON.stringify({
    //   'message' : 'this is a message',
    // });
    // webSocket.send(jsonStr);
    sendSignal('new-peer',{});
  });
  webSocket.addEventListener('message',webSocketOnMessage);
  webSocket.addEventListener('close',(e) => {
    console.log('Connection closed');
  });
  webSocket.addEventListener('error',(e) => {
    console.log('error occured');
  });
});
var localStream = new MediaStream();

const constrains = {
  'video' : true,
  'audio' :true,
};
const localVideo = document.querySelector('#local-video');
const btnToggleAudio = document.querySelector('#btn-toggle-audio');
const btnToggleVideo = document.querySelector('#btn-toggle-video');
console.log('this is in the localVideo')

var userMedia = navigator.mediaDevices.getUserMedia(constrains)
      .then(stream =>{
        console.log("this is in the then")
        localStream = stream;
        localVideo.srcObject = localStream;
        localVideo.muted = true;

        var audioTracks = stream.getAudioTracks();
        var videoTracks = stream.getVideoTracks();
        audioTracks[0].enabled = true;
        videoTracks[0].enabled = true;
        btnToggleAudio.addEventListener('click',()=>{
          audioTracks[0].enabled = !audioTracks[0].enabled;
          if (audioTracks[0].enabled){
            btnToggleAudio.innerHTML = 'audio mute';
            return;
          }
          btnToggleAudio.innerHTML = 'audio unmute';
        });
        btnToggleVideo.addEventListener('click',()=>{
          videoTracks[0].enabled = !videoTracks[0].enabled;
          if (audioTracks[0].enabled){
            btnToggleVideo.innerHTML = 'video off';
            return;
          }
          btnToggleVideo.innerHTML = 'video unmute';
        });
      })
      .catch(error => {
        console.log('Error accesing media devices.',error)
      });
var btnSendMsg = document.querySelector("#btn-send-msg");
var messageList = document.querySelector('#message-list');
var messageInput = document.querySelector('#msg');
btnSendMsg.addEventListener('click',sendMsgOnClick);
function sendMsgOnClick(){
  var message = messageInput.value;
  var li = document.createElement('li');
  li.appendChild(document.createTextNode('Me:' + message));
  messageList.appendChild(li);
  console.log('messageList:',messageList);
  var dataChannels = getDataChannels();
  console.log('dataChannels:',dataChannels);
  message = username + ':' + message;
  for(index in dataChannels){
    dataChannels[index].send(message);
  }
  messageInput.value = '';
}

function sendSignal(action,message){
  var jsonStr = JSON.stringify({
    'peer': username,
    'action' :action,
    'message' : message,

  });
  webSocket.send(jsonStr);

}
function createOfferer(peerUsername,receiver_channel_name){
  var peer = new RTCPeerConnection(null);
  addLocalTracks(peer);
  var dc = peer.createDataChannel('chanel');
  dc.addEventListener('open',() =>{
    console.log('Connection Oppened!');
  });
  dc.addEventListener('message',dcOnMessage);
  var remoteVideo = createVideo(peerUsername);
  setOnTrack(peer,remoteVideo);
  mapPeers[peerUsername] = [peer,dc];
  peer.addEventListener('iceconnectionstatechange',() =>{
    var iceconnectionstate = peer.iceconnectionstate;
    if(iceconnectionstate === 'failed' || iceconnectionstate === 'disconnected' || iceconnectionstate === 'closed'){
      delete mapPeers[peerUsername];
      if(iceconnectionstate != 'closed'){
        peer.close();
      }
      remoteVideo(remoteVideo);
    }
  });
  peer.addEventListener('icecandidate',(event) =>{
    if(event.candidate){
      console.log('new ice candidate:',JSON.stringify(peer.localDescription));
      return;
    }
    sendSignal('new-offer',{
      'sdp' : peer.localDescription,
      'receiver_channel_name' : receiver_channel_name
    });
  });
  peer.createOffer()
      .then(o => peer.setLocalDescription(o))
      .then(()=>{
        console.log("local description set seccesfully");
      });

}
function createAnswerer(offer,peerUsername,receiver_channel_name){
  console.log('its under createAnswer');
  var peer = new RTCPeerConnection(null);
  addLocalTracks(peer);
  // var dc = peer.createDataChannel('chanel');
  // dc.addEventListener('open',() =>{
  //   console.log('Connection Oppened!');
  // });
  // dc.addEventListener('message',dcOnMessage);
  var remoteVideo = createVideo(peerUsername);
  setOnTrack(peer,remoteVideo);
  peer.addEventListener('datachannel',e =>{
    peer.dc = e.channel;
    peer.dc.addEventListener('open',() =>{
      console.log('Connection Oppened!');
    });
    peer.dc.addEventListener('message',dcOnMessage);
    mapPeers[peerUsername] = [peer,peer.dc];
  })
  // mapPeers[peerUsername] = [peer,dc];
  peer.addEventListener('iceconnectionstatechange',() =>{
    var iceconnectionstate = peer.iceconnectionstate;
    if(iceconnectionstate === 'failed' || iceconnectionstate === 'disconnected' || iceconnectionstate === 'closed'){
      delete mapPeers[peerUsername];
      if(iceconnectionstate != 'closed'){
        peer.close();
      }
      remoteVideo(remoteVideo);
    }
  });
  peer.addEventListener('icecandidate',(event) =>{
    if(event.candidate){
      console.log('new ice candidate:',JSON.stringify(peer.localDescription));
      return;
    }
    sendSignal('new-answer',{
      'sdp' : peer.localDescription,
      'receiver_channel_name' : receiver_channel_name
    });
  });
  peer.setRemoteDescription(offer)
      .then(() => {
        console.log('remote description set succesfully for %s',peerUsername);
        return peer.createAnswer();
      })
      .then(a =>{
        console.log('answer crated');
        peer.setLocalDescription(a);
      })
  // peer.createOffer()
  //     .then(o => peer.setLocalDescription(o))
  //     .then(()=>{
  //       console.log("local description set seccesfully");
  //     });

}
function addLocalTracks(peer){
  localStream.getTracks().forEach(track =>{
    peer.addTrack(track,localStream);
  });
  return;
}
// var messageList = document.querySelector('#message-list')
function dcOnMessage(event){
  var message = event.data;
  var li = document.createElement('li');
  li.appendChild(document.createTextNode(message));
  messageList.appendChild(li);
}
function createVideo(peerUsername){
  var videoContainer = document.querySelector('#video-container');
  var remoteVideo = document.createElement('video');
  remoteVideo.id = peerUsername + '-video';
  remoteVideo.autoplay = true;
  remoteVideo.playsInline = true;
  var videoWrapper = document.createElement('div');
  videoContainer.appendChild(videoWrapper);
  videoWrapper.appendChild(remoteVideo);
  return remoteVideo;

}
function setOnTrack(peer,remoteVideo){
  var remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;
  peer.addEventListener('track',async (event) =>{
    remoteStream.addTrack(event.track,remoteStream);
  });
}
function remoteVideo(vedio){
  var videoWrapper = video.parentNode;
  videoWrapper.parentNode.removeChild(videoWrapper);
}
function getDataChannels(){
  var dataChannels = [];
  for(peerUsername in mapPeers){
    var dataChannel = mapPeers[peerUsername][1];
    dataChannels.push(dataChannel);
  }
  return dataChannels;
}
