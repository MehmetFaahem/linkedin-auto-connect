// Add this to the top of your background.js file
chrome.action.onClicked.addListener((tab) => {
  // Check if we're on LinkedIn
  if (tab.url.includes("linkedin.com")) {
    // Inject our modal into the LinkedIn page
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: injectModal
    });
  } else {
    // Show notification if not on LinkedIn
    // Fix the iconUrl to use a valid path
    chrome.notifications.create('linkedinNotification', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'LinkedIn Auto Connect',
      message: 'Please navigate to LinkedIn first before using this extension',
      priority: 2
    });
    
    // Also create a temporary toast on the current page
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: showLinkedInRequiredToast
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startConnecting") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab.url.includes("linkedin.com")) {
        chrome.tabs.sendMessage(activeTab.id, { action: "startConnecting", config: message.config });
      } else {
        chrome.runtime.sendMessage({ action: "notification", message: "Please navigate to LinkedIn first" });
      }
    });
  }
  return true;
});

// Function to inject our modal into the LinkedIn page
function injectModal() {
  // Check if modal already exists
  if (document.getElementById('linkedin-auto-connect-modal')) {
    // If it exists, just show it
    document.getElementById('linkedin-auto-connect-modal').style.display = 'block';
    return;
  }

  // Fetch our CSS
  fetch(chrome.runtime.getURL('styles.css'))
    .then(response => response.text())
    .then(css => {
      // Create style element
      const style = document.createElement('style');
      style.textContent = css + `
        #linkedin-auto-connect-modal {
          position: fixed;
          top: 0;
          right: 0;
          width: 350px;
          height: 100vh;
          background: white;
          box-shadow: -5px 0 15px rgba(0,0,0,0.1);
          z-index: 9999;
          overflow-y: auto;
          padding: 20px;
          box-sizing: border-box;
        }
        .modal-close-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
        }
      `;
      document.head.appendChild(style);
    });

  // Create modal container
  const modal = document.createElement('div');
  modal.id = 'linkedin-auto-connect-modal';
  
  // Add HTML content
  // Update the textarea with inline styles to ensure the placeholder is visible
  // In the modal HTML content, update the checkbox to be checked by default
  modal.innerHTML = `
    <button class="modal-close-btn">×</button>
    <h1>LinkedIn Auto Connect</h1>
    
    <div class="form-group">
      <label for="maxConnections">Max Connections:</label>
      <input type="number" id="maxConnections" min="1" max="1000" value="100">
    </div>
    
    <div class="form-group">
      <label for="delay">Delay between requests (ms):</label>
      <input type="number" id="delay" min="1000" max="10000" value="2000">
    </div>
    
    <div class="form-group">
      <div class="checkbox-wrapper">
        <input type="checkbox" id="addNote" checked style="border: 1px solid black; outline: 1px solid black;">
        <label for="addNote" style="color: black !important;">Add personalized note:</label>
      </div>
    </div>
    
    <div class="form-group note-container">
      <label for="customMessage">Custom message:</label>
      <textarea id="customMessage" rows="4" placeholder="Enter your personalized connection message here..." style="color: black; background-color: white; border: 1px solid #ddd; ::placeholder { color: #666 !important; opacity: 1; }"></textarea>
    </div>
    
    <div class="button-group">
      <button id="startBtn" class="primary-btn">Start Connecting</button>
      <button id="stopBtn" class="secondary-btn" disabled>Stop</button>
    </div>
    
    <div class="status-container" style="display: none;">
      <h3>Status:</h3>
      <p class='stats'>Connections processed: <span id="connectionsProcessed">0</span></p>
      <p class='stats'>Connections added: <span id="connectionsAdded">0</span></p>
    </div>
    
    <div class="instructions">
      <h3>Instructions:</h3>
      <ol>
        <li>Navigate to a LinkedIn search results or "People You May Know" page</li>
        <li>Configure your settings above</li>
        <li>Click "Start Connecting"</li>
        <li>Keep the LinkedIn tab open while the extension works</li>
      </ol>
    </div>
  `;
  
  // Append modal to body
  document.body.appendChild(modal);
  
  // Add event listeners
  document.querySelector('.modal-close-btn').addEventListener('click', () => {
    document.getElementById('linkedin-auto-connect-modal').style.display = 'none';
  });
  
  // Load saved settings
  chrome.storage.local.get(['maxConnections', 'delay', 'addNote', 'customMessage'], function(data) {
    if (data.maxConnections) document.getElementById('maxConnections').value = data.maxConnections;
    if (data.delay) document.getElementById('delay').value = data.delay;
    if (data.addNote) document.getElementById('addNote').checked = data.addNote;
    if (data.customMessage) document.getElementById('customMessage').value = data.customMessage;
    
    // Show/hide note container based on checkbox
    document.querySelector('.note-container').style.display = 
      document.getElementById('addNote').checked ? 'block' : 'none';
  });
  
  // Toggle note container visibility
  document.getElementById('addNote').addEventListener('change', function() {
    document.querySelector('.note-container').style.display = this.checked ? 'block' : 'none';
    
    // Save setting
    chrome.storage.local.set({ addNote: this.checked });
  });
  
  // Save settings when changed
  document.getElementById('maxConnections').addEventListener('change', function() {
    chrome.storage.local.set({ maxConnections: this.value });
  });
  
  document.getElementById('delay').addEventListener('change', function() {
    chrome.storage.local.set({ delay: this.value });
  });
  
  document.getElementById('customMessage').addEventListener('input', function() {
    chrome.storage.local.set({ customMessage: this.value });
  });
  
  // Start connecting
  document.getElementById('startBtn').addEventListener('click', function() {
    const config = {
      maxConnections: parseInt(document.getElementById('maxConnections').value, 10),
      delay: parseInt(document.getElementById('delay').value, 10),
      addNote: document.getElementById('addNote').checked,
      customMessage: document.getElementById('customMessage').value
    };
    
    chrome.runtime.sendMessage({ action: "startConnecting", config: config });
    
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    document.querySelector('.status-container').style.display = 'block';
  });
  
  // Stop connecting
  document.getElementById('stopBtn').addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: "stopConnecting" });
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
  });
  
  // Listen for status updates
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === "updateStatus") {
      document.getElementById('connectionsProcessed').textContent = message.status.connectionsProcessed;
      document.getElementById('connectionsAdded').textContent = message.status.connectionsAdded;
      
      if (!message.status.isRunning) {
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
      }
    } else if (message.action === "notification") {
      // Display notification in modal
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.textContent = message.message;
      document.getElementById('linkedin-auto-connect-modal').appendChild(notification);
      
      // Remove after 5 seconds
      setTimeout(() => {
        notification.remove();
      }, 5000);
    }
  });
}

// Add this new function to show a toast on non-LinkedIn pages
function showLinkedInRequiredToast() {
  // Create toast element if it doesn't exist
  if (!document.getElementById('linkedin-extension-toast')) {
    const toast = document.createElement('div');
    toast.id = 'linkedin-extension-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #0a66c2;
      color: white;
      padding: 15px 20px;
      border-radius: 4px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      max-width: 300px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;
    
    toast.innerHTML = `
      <div>
        <strong>LinkedIn Auto Connect</strong>
        <p style="margin: 5px 0 0 0;">Please navigate to LinkedIn first to use this extension.</p>
      </div>
      <button id="toast-close-btn" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; margin-left: 10px;">×</button>
    `;
    
    document.body.appendChild(toast);
    
    // Add close button functionality
    document.getElementById('toast-close-btn').addEventListener('click', function() {
      document.getElementById('linkedin-extension-toast').remove();
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      const toastElement = document.getElementById('linkedin-extension-toast');
      if (toastElement) {
        toastElement.remove();
      }
    }, 5000);
  }
}

// Also update the style injection to make the checkbox more visible
setTimeout(() => {
  const style = document.createElement('style');
  style.textContent = `
    #linkedin-auto-connect-modal textarea::placeholder {
      color: #666 !important;
      opacity: 1;
    }
    #linkedin-auto-connect-modal input[type="checkbox"] {
      width: 16px;
      height: 16px;
      border: 2px solid black !important;
      outline: 1px solid black !important;
      accent-color: #0a66c2;
      margin-right: 8px;
    }
  `;
  document.head.appendChild(style);
}, 100);