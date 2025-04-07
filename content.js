let isRunning = false;
let connectionsProcessed = 0;
let connectionsAdded = 0;
let delay = 2000;
let maxConnections = 100;
let customMessage = "";
let addNote = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startConnecting") {
    if (!isRunning) {
      isRunning = true;
      
      // Get configuration from popup
      delay = message.config.delay || 2000;
      maxConnections = message.config.maxConnections || 100;
      customMessage = message.config.customMessage || "";
      addNote = message.config.addNote || false;
      
      // Reset counters
      connectionsProcessed = 0;
      connectionsAdded = 0;
      
      // Start the connection process
      processConnections();
      
      sendResponse({ status: "started" });
    } else {
      sendResponse({ status: "already running" });
    }
  } else if (message.action === "stopConnecting") {
    isRunning = false;
    sendResponse({ status: "stopped" });
  } else if (message.action === "getStatus") {
    sendResponse({
      isRunning,
      connectionsProcessed,
      connectionsAdded
    });
  }
  return true;
});

function processConnections() {
  if (!isRunning) return;
  
  // Update status
  chrome.runtime.sendMessage({
    action: "updateStatus",
    status: {
      isRunning,
      connectionsProcessed,
      connectionsAdded
    }
  });
  
  // Find all "Connect" buttons on the page
  const connectButtons = findConnectButtons();
  
  if (connectButtons.length > 0 && connectionsAdded < maxConnections) {
    // Process the first button
    processConnectButton(connectButtons[0]);
  } else {
    // Scroll down to load more results
    window.scrollTo(0, document.body.scrollHeight);
    
    // Wait for new content to load
    setTimeout(() => {
      const newButtons = findConnectButtons();
      if (newButtons.length === 0) {
        // Try to go to the next page
        goToNextPage();
      } else if (connectionsAdded >= maxConnections) {
        // Reached max connections
        isRunning = false;
        chrome.runtime.sendMessage({
          action: "notification",
          message: `Finished! Added ${connectionsAdded} connections.`
        });
      } else {
        // Continue processing
        processConnections();
      }
    }, delay);
  }
}

// Add this new function to navigate to the next page
function goToNextPage() {
  // Find the "Next" button on LinkedIn search results
  const nextButton = findNextPageButton();
  
  if (nextButton) {
    // Click the next button
    nextButton.click();
    
    // Wait for the next page to load
    setTimeout(() => {
      // Continue processing connections on the new page
      processConnections();
    }, delay * 2); // Use a longer delay for page navigation
  } else {
    // No next button found, we've reached the end
    isRunning = false;
    chrome.runtime.sendMessage({
      action: "notification",
      message: `Finished! Added ${connectionsAdded} connections. No more pages available.`
    });
  }
}

// Add this function to find the next page button
function findNextPageButton() {
  // LinkedIn uses different selectors for pagination, try multiple options
  const possibleNextButtons = [
    // Common LinkedIn pagination button selectors
    'button[aria-label="Next"]',
    'button.artdeco-pagination__button--next',
    'li.artdeco-pagination__button--next button',
    // Text-based selectors as fallback
    'button:contains("Next")',
    'button span:contains("Next")'
  ];
  
  for (const selector of possibleNextButtons) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        // Check if the button is not disabled
        if (!el.disabled && !el.classList.contains('artdeco-button--disabled')) {
          return el;
        }
      }
    } catch (e) {
      console.error("Next button selector error:", e);
    }
  }
  
  return null;
}

function findConnectButtons() {
  // This selector needs to be updated based on LinkedIn's current DOM structure
  // These are common patterns but may need adjustment
  const possibleSelectors = [
    'button.artdeco-button:not(.artdeco-button--muted):not([aria-pressed="true"]):not([data-processed="true"])',
    'button.artdeco-button span:contains("Connect")',
    'button[aria-label*="Connect"]',
    'button[aria-label*="connect"]'
  ];
  
  let buttons = [];
  
  for (const selector of possibleSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.textContent.includes("Connect") && !el.hasAttribute("data-processed")) {
          buttons.push(el);
        }
      });
    } catch (e) {
      console.error("Selector error:", e);
    }
  }
  
  return buttons;
}

function processConnectButton(button) {
  if (!isRunning) return;
  
  // Mark as processed to avoid reprocessing
  button.setAttribute("data-processed", "true");
  connectionsProcessed++;
  
  try {
    // Click the connect button
    button.click();
    
    // Wait for the modal to appear
    setTimeout(() => {
      if (addNote) {
        // Try to find the "Add a note" button
        const addNoteButton = document.querySelector('button[aria-label*="Add a note"]');
        if (addNoteButton) {
          addNoteButton.click();
          
          // Wait for the note textarea to appear
          setTimeout(() => {
            const noteTextarea = document.querySelector('textarea#custom-message');
            if (noteTextarea) {
              noteTextarea.value = customMessage;
              noteTextarea.dispatchEvent(new Event('input', { bubbles: true }));
              
              // Click the Send button
              setTimeout(() => {
                const sendButton = document.querySelector('button[aria-label*="Send"]');
                if (sendButton) {
                  sendButton.click();
                  connectionsAdded++;
                }
                
                // Continue with the next connection
                setTimeout(processConnections, delay);
              }, 1000);
            } else {
              // If textarea not found, just continue
              setTimeout(processConnections, delay);
            }
          }, 1000);
        } else {
          // If "Add a note" button not found, just send the connection
          const sendButton = document.querySelector('button[aria-label*="Send"]');
          if (sendButton) {
            sendButton.click();
            connectionsAdded++;
          }
          
          // Continue with the next connection
          setTimeout(processConnections, delay);
        }
      } else {
        // Just send without a note
        const sendButton = document.querySelector('button[aria-label*="Send"]');
        if (sendButton) {
          sendButton.click();
          connectionsAdded++;
        }
        
        // Continue with the next connection
        setTimeout(processConnections, delay);
      }
    }, 1000);
  } catch (e) {
    console.error("Error processing connect button:", e);
    // Continue with the next connection despite error
    setTimeout(processConnections, delay);
  }
}