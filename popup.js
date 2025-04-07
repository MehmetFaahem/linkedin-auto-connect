document.addEventListener('DOMContentLoaded', function() {
  // Add this at the top
  const closeBtn = document.getElementById('closeBtn');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const maxConnectionsInput = document.getElementById('maxConnections');
  const delayInput = document.getElementById('delay');
  const addNoteCheckbox = document.getElementById('addNote');
  const customMessageTextarea = document.getElementById('customMessage');
  const noteContainer = document.querySelector('.note-container');
  const statusContainer = document.querySelector('.status-container');
  const connectionsProcessedSpan = document.getElementById('connectionsProcessed');
  const connectionsAddedSpan = document.getElementById('connectionsAdded');
  
  // Load saved settings
  chrome.storage.local.get(['maxConnections', 'delay', 'addNote', 'customMessage'], function(data) {
    if (data.maxConnections) maxConnectionsInput.value = data.maxConnections;
    if (data.delay) delayInput.value = data.delay;
    if (data.addNote) addNoteCheckbox.checked = data.addNote;
    if (data.customMessage) customMessageTextarea.value = data.customMessage;
    
    // Show/hide note container based on checkbox
    noteContainer.style.display = addNoteCheckbox.checked ? 'block' : 'none';
  });
  
  // Toggle note container visibility
  addNoteCheckbox.addEventListener('change', function() {
    noteContainer.style.display = this.checked ? 'block' : 'none';
    
    // Save setting
    chrome.storage.local.set({ addNote: this.checked });
  });
  
  // Save settings when changed
  maxConnectionsInput.addEventListener('change', function() {
    chrome.storage.local.set({ maxConnections: this.value });
  });
  
  delayInput.addEventListener('change', function() {
    chrome.storage.local.set({ delay: this.value });
  });
  
  customMessageTextarea.addEventListener('input', function() {
    chrome.storage.local.set({ customMessage: this.value });
  });
  
  // Start connecting
  startBtn.addEventListener('click', function() {
    const config = {
      maxConnections: parseInt(maxConnectionsInput.value, 10),
      delay: parseInt(delayInput.value, 10),
      addNote: addNoteCheckbox.checked,
      customMessage: customMessageTextarea.value
    };
    
    chrome.runtime.sendMessage({ action: "startConnecting", config: config });
    
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusContainer.style.display = 'block';
    
    // Start status updates
    statusUpdateInterval = setInterval(updateStatus, 1000);
  });
  
  // Stop connecting
  stopBtn.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "stopConnecting" });
    });
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
    // Stop status updates
    clearInterval(statusUpdateInterval);
  });
  
  // Update status
  let statusUpdateInterval;
  
  function updateStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "getStatus" }, function(response) {
        if (response) {
          connectionsProcessedSpan.textContent = response.connectionsProcessed;
          connectionsAddedSpan.textContent = response.connectionsAdded;
          
          if (!response.isRunning) {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            clearInterval(statusUpdateInterval);
          }
        }
      });
    });
  }
  
  // Listen for status updates from content script
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === "updateStatus") {
      connectionsProcessedSpan.textContent = message.status.connectionsProcessed;
      connectionsAddedSpan.textContent = message.status.connectionsAdded;
      
      if (!message.status.isRunning) {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        clearInterval(statusUpdateInterval);
      }
    } else if (message.action === "notification") {
      // Display notification in popup
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.textContent = message.message;
      document.body.appendChild(notification);
      
      // Remove after 5 seconds
      setTimeout(() => {
        notification.remove();
      }, 5000);
    }
  });
  
  // Add this close button handler
  closeBtn.addEventListener('click', function() {
    window.close();
  });
});