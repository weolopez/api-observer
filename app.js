// Dynamic import of trystero modules
let currentStrategy = 'nostr';
let trysteroModule;
let room = null;
let currentStream = null;
let actionHandlers = {};

const config = { appId: 'messaging-observer' };

// DOM Elements
const strategySelect = document.getElementById('strategy');
const roomIdInput = document.getElementById('roomId');
const joinRoomBtn = document.getElementById('joinRoom');
const leaveRoomBtn = document.getElementById('leaveRoom');
const statusEl = document.getElementById('status');
const selfIdEl = document.getElementById('selfId');
const peersListEl = document.getElementById('peersList');
const actionNameInput = document.getElementById('actionName');
const actionDataInput = document.getElementById('actionData');
const sendActionBtn = document.getElementById('sendAction');
const sendFileBtn = document.getElementById('sendFile');
const fileInputEl = document.getElementById('fileInput');
const actionLogEl = document.getElementById('actionLog');
const shareCameraBtn = document.getElementById('shareCamera');
const shareScreenBtn = document.getElementById('shareScreen');
const stopSharingBtn = document.getElementById('stopSharing');
const localVideoEl = document.getElementById('localVideo');
const remoteStreamsEl = document.getElementById('remoteStreams');
const rtcStatsEl = document.getElementById('rtcStats');
const relaySocketsEl = document.getElementById('relaySockets');
const wsMonitorEl = document.getElementById('wsMonitor');
const clearWsLogBtn = document.getElementById('clearWsLog');
const pauseWsLogBtn = document.getElementById('pauseWsLog');
const filterSdpCheckbox = document.getElementById('filterSdp');

// Initialize the app
async function init() {
  logMessage('Initializing Trystero API Observer...', 'system');
  
  // Check if the dist files might exist
  try {
    await loadStrategy(currentStrategy);
    setupEventListeners();
    
    // Start network info monitoring
    setInterval(updateNetworkInfo, 2000);
    
    logMessage('Application initialized successfully', 'system');
  } catch (error) {
    logMessage(`Initialization error: ${error.message}`, 'system');
    logMessage('Make sure to run "npm run build" first to create the distribution files', 'system');
    console.error('Initialization error:', error);
  }
}

// Load the selected strategy module
async function loadStrategy(strategy) {
  try {
    // Use the pre-built strategy bundles from the parent directory
    const moduleUrl = `../dist/trystero-${strategy}.min.js`;
    
    const module = await import(moduleUrl);
    trysteroModule = module;
    
    logMessage(`Loaded strategy: ${strategy}`, 'system');
  } catch (error) {
    logMessage(`Error loading strategy: ${error.message}`, 'system');
    console.error('Error loading strategy module:', error);
  }
}

// Set up UI event listeners
function setupEventListeners() {
  strategySelect.addEventListener('change', handleStrategyChange);
  joinRoomBtn.addEventListener('click', joinRoom);
  leaveRoomBtn.addEventListener('click', leaveRoom);
  sendActionBtn.addEventListener('click', sendAction);
  sendFileBtn.addEventListener('click', () => fileInputEl.click());
  fileInputEl.addEventListener('change', sendFile);
  shareCameraBtn.addEventListener('click', shareCamera);
  shareScreenBtn.addEventListener('click', shareScreen);
  stopSharingBtn.addEventListener('click', stopSharing);
  
  // WebSocket monitor controls
  clearWsLogBtn.addEventListener('click', clearWsLog);
  pauseWsLogBtn.addEventListener('click', toggleWsLogPause);
  filterSdpCheckbox.addEventListener('change', updateWsLogFilter);
  document.getElementById('showInfo').addEventListener('click', toggleWsInfo);
  
  // Add click listener to WebSocket log to expand/collapse JSON messages
  wsMonitorEl.addEventListener('click', event => {
    const target = event.target;
    if (target.classList.contains('collapsed')) {
      const messageEl = target.closest('.ws-message');
      if (messageEl) {
        messageEl.classList.toggle('expanded');
      }
    }
  });
}

// Handle strategy selection change
async function handleStrategyChange(event) {
  const newStrategy = event.target.value;
  
  if (room) {
    await leaveRoom();
  }
  
  currentStrategy = newStrategy;
  await loadStrategy(newStrategy);
  logMessage(`Strategy changed to ${newStrategy}`, 'system');
}

// Join a room
async function joinRoom() {
  if (room) return;
  
  const roomId = roomIdInput.value.trim() || 'demo-room';
  
  try {
    room = trysteroModule.joinRoom(config, roomId);
    
    // Set up room event handlers
    room.onPeerJoin(handlePeerJoin);
    room.onPeerLeave(handlePeerLeave);
    room.onPeerStream(handlePeerStream);
    
    // Update UI
    statusEl.textContent = 'Connected';
    selfIdEl.textContent = trysteroModule.selfId;
    
    // Enable UI controls
    toggleRoomControls(true);
    
    logMessage(`Joined room: ${roomId}`, 'system');
    
    // Setup action handlers
    setupDefaultActions();
  } catch (error) {
    logMessage(`Error joining room: ${error.message}`, 'system');
    console.error('Error joining room:', error);
  }
}

// Leave the current room
function leaveRoom() {
  if (!room) return;
  
  // Clean up
  stopSharing();
  cleanupActionHandlers();
  
  // Leave room
  room.leave();
  room = null;
  
  // Update UI
  statusEl.textContent = 'Disconnected';
  selfIdEl.textContent = '-';
  peersListEl.innerHTML = '';
  toggleRoomControls(false);
  
  logMessage('Left room', 'system');
}

// Handle peer joining the room
function handlePeerJoin(peerId) {
  logMessage(`Peer joined: ${peerId}`, 'system');
  addPeerToList(peerId);
}

// Handle peer leaving the room
function handlePeerLeave(peerId) {
  logMessage(`Peer left: ${peerId}`, 'system');
  removePeerFromList(peerId);
  removePeerStream(peerId);
}

// Handle receiving a peer's media stream
function handlePeerStream(stream, peerId, metadata) {
  logMessage(`Received stream from peer: ${peerId}${metadata ? ` (${JSON.stringify(metadata)})` : ''}`, 'system');
  addPeerStream(stream, peerId);
}

// Add a peer to the peers list UI
function addPeerToList(peerId) {
  const peerEl = document.createElement('div');
  peerEl.className = 'peer-item';
  peerEl.id = `peer-${peerId}`;
  peerEl.innerHTML = `
    <span>${peerId}</span>
    <span class="peer-status">Connected</span>
  `;
  peersListEl.appendChild(peerEl);
}

// Remove a peer from the peers list UI
function removePeerFromList(peerId) {
  const peerEl = document.getElementById(`peer-${peerId}`);
  if (peerEl) {
    peerEl.remove();
  }
}

// Add a peer's media stream to the UI
function addPeerStream(stream, peerId) {
  // First check if this peer already has a stream
  let videoContainer = document.getElementById(`video-container-${peerId}`);
  
  if (!videoContainer) {
    // Create new video container
    videoContainer = document.createElement('div');
    videoContainer.className = 'remote-stream';
    videoContainer.id = `video-container-${peerId}`;
    
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsinline = true;
    video.id = `video-${peerId}`;
    
    const peerLabel = document.createElement('div');
    peerLabel.className = 'peer-id';
    peerLabel.textContent = peerId;
    
    videoContainer.appendChild(video);
    videoContainer.appendChild(peerLabel);
    remoteStreamsEl.appendChild(videoContainer);
  }
  
  // Update the video stream
  const videoEl = document.getElementById(`video-${peerId}`);
  if (videoEl) {
    videoEl.srcObject = stream;
  }
}

// Remove a peer's media stream from the UI
function removePeerStream(peerId) {
  const videoContainer = document.getElementById(`video-container-${peerId}`);
  if (videoContainer) {
    videoContainer.remove();
  }
}

// Share camera video
async function shareCamera() {
  try {
    if (currentStream) {
      stopSharing();
    }
    
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    
    localVideoEl.srcObject = currentStream;
    room.addStream(currentStream);
    
    stopSharingBtn.disabled = false;
    shareCameraBtn.disabled = true;
    shareScreenBtn.disabled = true;
    
    logMessage('Sharing camera', 'system');
  } catch (error) {
    logMessage(`Error sharing camera: ${error.message}`, 'system');
    console.error('Error sharing camera:', error);
  }
}

// Share screen
async function shareScreen() {
  try {
    if (currentStream) {
      stopSharing();
    }
    
    currentStream = await navigator.mediaDevices.getDisplayMedia({
      video: true
    });
    
    // Handle user canceling screen share dialog
    currentStream.getVideoTracks()[0].addEventListener('ended', () => {
      stopSharing();
    });
    
    localVideoEl.srcObject = currentStream;
    room.addStream(currentStream, null, { type: 'screen' });
    
    stopSharingBtn.disabled = false;
    shareCameraBtn.disabled = true;
    shareScreenBtn.disabled = true;
    
    logMessage('Sharing screen', 'system');
  } catch (error) {
    logMessage(`Error sharing screen: ${error.message}`, 'system');
    console.error('Error sharing screen:', error);
  }
}

// Stop sharing media
function stopSharing() {
  if (currentStream) {
    // Stop all tracks
    currentStream.getTracks().forEach(track => track.stop());
    
    // Remove stream from room
    if (room) {
      room.removeStream(currentStream);
    }
    
    // Clear local video
    localVideoEl.srcObject = null;
    currentStream = null;
    
    // Update UI
    stopSharingBtn.disabled = true;
    shareCameraBtn.disabled = false;
    shareScreenBtn.disabled = false;
    
    logMessage('Stopped sharing media', 'system');
  }
}

// Set up default action handlers
function setupDefaultActions() {
  // Clean up any existing handlers
  cleanupActionHandlers();
  
  // Set up default message action
  setupAction('message');
  
  // Set up ping action
  const [sendPing, getPing] = room.makeAction('ping');
  
  getPing((data, peerId) => {
    logMessage(`Received ping from ${peerId}: ${data}`, 'received');
    // Auto-reply to pings
    sendPing('pong', peerId);
  });
  
  actionHandlers.ping = {
    send: sendPing,
    receive: getPing
  };
}

// Setup an action by name
function setupAction(actionName) {
  if (!room) return;
  
  // Remove existing handler
  if (actionHandlers[actionName]) {
    delete actionHandlers[actionName];
  }
  
  // Create new action
  const [sendAction, getAction, onActionProgress] = room.makeAction(actionName);
  
  // Set up receiver
  getAction((data, peerId, metadata) => {
    logMessage(`Received ${actionName} from ${peerId}: ${JSON.stringify(data)}${metadata ? ` (metadata: ${JSON.stringify(metadata)})` : ''}`, 'received');
  });
  
  // Set up progress handler
  onActionProgress((progress, peerId, metadata) => {
    if (progress < 1) { // Only log progress updates that aren't complete
      logMessage(`Progress for ${actionName} from ${peerId}: ${Math.round(progress * 100)}%${metadata ? ` (metadata: ${JSON.stringify(metadata)})` : ''}`, 'system');
    }
  });
  
  // Store handlers
  actionHandlers[actionName] = {
    send: sendAction,
    receive: getAction,
    progress: onActionProgress
  };
  
  logMessage(`Set up action: ${actionName}`, 'system');
}

// Clean up action handlers
function cleanupActionHandlers() {
  actionHandlers = {};
}

// Send an action to peers
async function sendAction() {
  if (!room) return;
  
  const actionName = actionNameInput.value.trim();
  let actionData;
  
  try {
    actionData = JSON.parse(actionDataInput.value);
  } catch (error) {
    // If not valid JSON, use as plain text
    actionData = actionDataInput.value;
  }
  
  // Get or create action handler
  if (!actionHandlers[actionName]) {
    setupAction(actionName);
  }
  
  // Send the action data
  try {
    await actionHandlers[actionName].send(actionData);
    logMessage(`Sent ${actionName}: ${JSON.stringify(actionData)}`, 'sent');
  } catch (error) {
    logMessage(`Error sending ${actionName}: ${error.message}`, 'system');
    console.error(`Error sending ${actionName}:`, error);
  }
}

// Log a message to the UI
function logMessage(message, type = 'system') {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry ${type}`;
  logEntry.textContent = `[${timestamp}] ${message}`;
  
  actionLogEl.appendChild(logEntry);
  actionLogEl.scrollTop = actionLogEl.scrollHeight;
}

// Send a file to all peers
async function sendFile(event) {
  if (!room || !event.target.files || !event.target.files[0]) return;
  
  const file = event.target.files[0];
  
  try {
    // Set up file action if not already set up
    if (!actionHandlers.file) {
      setupFileAction();
    }
    
    logMessage(`Sending file: ${file.name} (${formatFileSize(file.size)})`, 'system');
    
    // Read the file
    const buffer = await readFileAsArrayBuffer(file);
    
    // Send the file with metadata
    await actionHandlers.file.send(
      new Uint8Array(buffer),
      null, // send to all peers
      {
        name: file.name,
        type: file.type,
        size: file.size
      },
      // Progress callback
      (progress, peerId) => {
        const percent = Math.round(progress * 100);
        logMessage(`Sending to ${peerId}: ${percent}%`, 'system');
      }
    );
    
    logMessage(`File sent: ${file.name}`, 'sent');
  } catch (error) {
    logMessage(`Error sending file: ${error.message}`, 'system');
    console.error('Error sending file:', error);
  }
  
  // Reset the file input
  event.target.value = '';
}

// Set up the file action handler
function setupFileAction() {
  const [sendFile, getFile, onFileProgress] = room.makeAction('file');
  
  // Handle received files
  getFile((data, peerId, metadata) => {
    logMessage(`Received file from ${peerId}: ${metadata?.name || 'unnamed'} (${formatFileSize(data.byteLength)})`, 'received');
    
    // Create blob from data
    const blob = new Blob([data], {type: metadata?.type || 'application/octet-stream'});
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const filename = metadata?.name || `file-from-${peerId}`;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.textContent = `Download ${filename}`;
    link.className = 'download-link';
    link.addEventListener('click', () => {
      setTimeout(() => URL.revokeObjectURL(url), 100);
    });
    
    // Add download link to the log
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry received';
    logEntry.appendChild(link);
    actionLogEl.appendChild(logEntry);
    actionLogEl.scrollTop = actionLogEl.scrollHeight;
  });
  
  // Handle progress updates for incoming files
  onFileProgress((progress, peerId, metadata) => {
    const percent = Math.round(progress * 100);
    if (progress < 1) { // Only log progress updates that aren't complete
      logMessage(`Receiving from ${peerId}: ${percent}% of ${metadata?.name || 'file'}`, 'system');
    }
  });
  
  // Store handlers
  actionHandlers.file = {
    send: sendFile,
    receive: getFile,
    progress: onFileProgress
  };
}

// Helper function to read file as ArrayBuffer
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(new Error('Error reading file'));
    reader.readAsArrayBuffer(file);
  });
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  else return (bytes / 1073741824).toFixed(1) + ' GB';
}

// Toggle UI controls based on room connection state
function toggleRoomControls(connected) {
  joinRoomBtn.disabled = connected;
  leaveRoomBtn.disabled = !connected;
  sendActionBtn.disabled = !connected;
  sendFileBtn.disabled = !connected;
  shareCameraBtn.disabled = !connected;
  shareScreenBtn.disabled = !connected;
  stopSharingBtn.disabled = true; // Always disabled until sharing
}

// Update network information display
async function updateNetworkInfo() {
  if (!room) {
    rtcStatsEl.textContent = 'Not connected';
    relaySocketsEl.textContent = 'Not connected';
    return;
  }
  
  try {
    // Get peer connections
    const peerConnections = room.getPeers();
    let statsInfo = '';
    
    // Get stats for each peer connection
    if (Object.keys(peerConnections).length === 0) {
      statsInfo = 'No active peers';
    } else {
      for (const [peerId, peerConnection] of Object.entries(peerConnections)) {
        statsInfo += `Peer ${peerId}: `;
        
        try {
          // Get connection state
          statsInfo += `State: ${peerConnection.connectionState}, `;
          statsInfo += `ICE: ${peerConnection.iceConnectionState}, `;
          
          // Get selected candidate pair if available
          const stats = await peerConnection.getStats();
          let candidatePair = null;
          
          stats.forEach(report => {
            if (report.type === 'candidate-pair' && report.selected) {
              candidatePair = report;
            }
          });
          
          if (candidatePair) {
            statsInfo += `RTT: ${candidatePair.currentRoundTripTime * 1000}ms`;
          }
        } catch (e) {
          statsInfo += `Error: ${e.message}`;
        }
        
        statsInfo += '<br>';
      }
    }
    
    rtcStatsEl.innerHTML = statsInfo;
    
    // Get relay sockets if available
    if (trysteroModule.getRelaySockets) {
      const sockets = trysteroModule.getRelaySockets();
      let socketInfo = '';
      
      if (Object.keys(sockets).length === 0) {
        socketInfo = 'No relay sockets';
      } else {
        for (const [url, socket] of Object.entries(sockets)) {
          socketInfo += `${url}: ${socket.readyState === 1 ? 'Connected' : 'Disconnected'}<br>`;
        }
      }
      
      relaySocketsEl.innerHTML = socketInfo;
    } else {
      relaySocketsEl.textContent = 'Not available with this strategy';
    }
  } catch (error) {
    console.error('Error updating network info:', error);
  }
}

// WebSocket monitoring
let wsMonitorPaused = false;
let filterSdpMessages = true;
const originalWebSocket = window.WebSocket;

// Override the WebSocket constructor to monitor traffic
function setupWebSocketMonitoring() {
  window.WebSocket = function(url, protocols) {
    // Create a real WebSocket instance
    const ws = protocols ? new originalWebSocket(url, protocols) : new originalWebSocket(url);
    
    // Store the URL for display
    ws._url = url;
    
    // Intercept send method
    const originalSend = ws.send;
    ws.send = function(data) {
      logWebSocketMessage(ws, data, 'outgoing');
      return originalSend.apply(this, arguments);
    };
    
    // Intercept message event
    ws.addEventListener('message', event => {
      logWebSocketMessage(ws, event.data, 'incoming');
    });
    
    return ws;
  };
  
  // Copy properties from the original WebSocket
  for (const prop in originalWebSocket) {
    if (prop !== 'prototype') {
      window.WebSocket[prop] = originalWebSocket[prop];
    }
  }
  
  window.WebSocket.prototype = originalWebSocket.prototype;
}

// Log WebSocket message to the UI
function logWebSocketMessage(ws, data, direction) {
  if (wsMonitorPaused) return;
  
  let shouldFilter = false;
  let messageType = 'unknown';
  
  // Convert blob to string if needed
  let dataContent = data;
  let isBlob = false;
  
  if (data instanceof Blob) {
    isBlob = true;
    // We can't process blobs synchronously, so we'll show a placeholder
    dataContent = `[Binary data: ${data.size} bytes]`;
  }
  
  // Try to determine message type and if it should be filtered
  if (typeof data === 'string') {
    try {
      const jsonData = JSON.parse(data);
      
      // Check for SDP-related messages
      if (filterSdpMessages) {
        if (data.includes('sdp') || data.includes('SDP') || 
            (jsonData && (
              jsonData.sdp || 
              (jsonData.type && (jsonData.type === 'offer' || jsonData.type === 'answer'))
            ))) {
          messageType = 'sdp';
          shouldFilter = true;
        }
      }
      
      // Identify message types for better understanding
      if (jsonData) {
        if (jsonData.type && (jsonData.type === 'offer' || jsonData.type === 'answer')) {
          messageType = jsonData.type.toUpperCase();
        } else if (jsonData.type === 'candidate') {
          messageType = 'ICE_CANDIDATE';
        } else if (jsonData.type === 'ping' || jsonData.type === 'pong') {
          messageType = jsonData.type.toUpperCase();
        } else if (data.includes('heartbeat') || jsonData.heartbeat) {
          messageType = 'HEARTBEAT';
        }
      }
    } catch (e) {
      // Not JSON, check for other patterns
      if (data.includes('ping') || data === 'ping') {
        messageType = 'PING';
      } else if (data.includes('pong') || data === 'pong') {
        messageType = 'PONG';
      }
    }
  }
  
  // Skip filtered messages
  if (shouldFilter) {
    return;
  }
  
  // Create message element
  const timestamp = new Date().toLocaleTimeString();
  const messageEl = document.createElement('div');
  messageEl.className = `ws-message ${direction}`;
  
  // Create message header
  const timestampSpan = document.createElement('span');
  timestampSpan.className = 'timestamp';
  timestampSpan.textContent = timestamp;
  
  const urlSpan = document.createElement('span');
  urlSpan.className = 'url';
  try {
    urlSpan.textContent = new URL(ws._url).host;
  } catch (e) {
    urlSpan.textContent = ws._url || 'unknown';
  }
  
  const directionSpan = document.createElement('span');
  directionSpan.className = 'direction';
  directionSpan.textContent = direction === 'outgoing' ? '→ OUT' : '← IN';
  
  const typeSpan = document.createElement('span');
  typeSpan.className = 'type';
  typeSpan.textContent = messageType !== 'unknown' ? `[${messageType}]` : '';
  
  messageEl.appendChild(timestampSpan);
  messageEl.appendChild(urlSpan);
  messageEl.appendChild(directionSpan);
  messageEl.appendChild(typeSpan);
  
  // Handle different data types
  if (isBlob) {
    // Add placeholder for blob data
    const dataSpan = document.createElement('span');
    dataSpan.className = 'data';
    dataSpan.textContent = dataContent;
    messageEl.appendChild(dataSpan);
    
    // Optionally, read blob content if it's likely to be text
    // This is async and will update the message after it loads
    if (data.size < 10000) { // Only try to read small blobs
      const reader = new FileReader();
      reader.onload = function() {
        try {
          const text = reader.result;
          let jsonData;
          try {
            jsonData = JSON.parse(text);
            
            // Update with JSON format
            const collapsedDiv = document.createElement('div');
            collapsedDiv.className = 'collapsed';
            collapsedDiv.textContent = `${typeof jsonData === 'object' ? '{...}' : jsonData} (click to expand)`;
            
            const expandedDiv = document.createElement('div');
            expandedDiv.className = 'expanded';
            expandedDiv.textContent = JSON.stringify(jsonData, null, 2);
            
            dataSpan.textContent = ''; // Clear the placeholder
            dataSpan.appendChild(collapsedDiv);
            dataSpan.appendChild(expandedDiv);
          } catch (e) {
            // Not JSON, show as plain text
            dataSpan.textContent = text.length > 500 ? 
              text.substring(0, 500) + '... [truncated]' : text;
          }
        } catch (e) {
          // Keep the original placeholder if we can't read it
        }
      };
      reader.readAsText(data);
    }
  } else if (typeof dataContent === 'string') {
    try {
      // Try to parse as JSON for better display
      const jsonData = JSON.parse(dataContent);
      
      // Create collapsed and expanded views
      const collapsedDiv = document.createElement('div');
      collapsedDiv.className = 'collapsed';
      
      // Provide a more informative summary if possible
      let summary = '{...}';
      if (jsonData.type) {
        summary = `{type: "${jsonData.type}"${jsonData.sdp ? ', sdp: "..."' : ''}}`;
      } else if (Array.isArray(jsonData)) {
        summary = `[Array: ${jsonData.length} items]`;
      } else if (typeof jsonData === 'object') {
        const keys = Object.keys(jsonData);
        if (keys.length <= 3) {
          summary = `{${keys.map(k => `${k}: ...`).join(', ')}}`;
        }
      }
      
      collapsedDiv.textContent = `${summary} (click to expand)`;
      
      const expandedDiv = document.createElement('div');
      expandedDiv.className = 'expanded';
      expandedDiv.textContent = JSON.stringify(jsonData, null, 2);
      
      messageEl.appendChild(collapsedDiv);
      messageEl.appendChild(expandedDiv);
    } catch (e) {
      // Not valid JSON, display as plain text
      const dataSpan = document.createElement('span');
      dataSpan.className = 'data';
      
      // Truncate very long text
      if (dataContent.length > 500) {
        dataSpan.textContent = dataContent.substring(0, 500) + '... [truncated]';
      } else {
        dataSpan.textContent = dataContent;
      }
      
      messageEl.appendChild(dataSpan);
    }
  } else {
    // Handle other data types
    const dataSpan = document.createElement('span');
    dataSpan.className = 'data';
    dataSpan.textContent = `[${typeof dataContent}] ${String(dataContent)}`;
    messageEl.appendChild(dataSpan);
  }
  
  wsMonitorEl.appendChild(messageEl);
  wsMonitorEl.scrollTop = wsMonitorEl.scrollHeight;
  
  // Keep log from getting too large by removing old messages
  while (wsMonitorEl.children.length > 1000) {
    wsMonitorEl.removeChild(wsMonitorEl.firstChild);
  }
}

// Clear the WebSocket log
function clearWsLog() {
  wsMonitorEl.innerHTML = '';
}

// Toggle pausing of WebSocket log
function toggleWsLogPause() {
  wsMonitorPaused = !wsMonitorPaused;
  pauseWsLogBtn.textContent = wsMonitorPaused ? 'Resume' : 'Pause';
}

// Update WebSocket log filter
function updateWsLogFilter() {
  filterSdpMessages = filterSdpCheckbox.checked;
}

// Toggle WebSocket info panel
function toggleWsInfo() {
  const infoEl = document.getElementById('wsInfo');
  const isVisible = infoEl.style.display !== 'none';
  infoEl.style.display = isVisible ? 'none' : 'block';
  document.getElementById('showInfo').textContent = isVisible ? 'What am I seeing?' : 'Hide info';
}

// Initialize WebSocket monitoring
setupWebSocketMonitoring();

// Initialize the app
init();