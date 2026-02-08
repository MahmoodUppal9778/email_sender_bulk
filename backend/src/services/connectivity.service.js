const axios = require('axios');
const QueueState = require('../models/QueueState.model');

let checkInterval = null;
const CHECK_INTERVAL = 30000; // 30 seconds

// Test connectivity
async function checkConnectivity() {
  try {
    // Try multiple endpoints
    const endpoints = [
      'https://www.google.com/generate_204',
      'https://www.cloudflare.com/cdn-cgi/trace',
      'https://httpbin.org/ip'
    ];

    for (const endpoint of endpoints) {
      try {
        await axios.get(endpoint, { timeout: 5000 });
        return true;
      } catch {}
    }
    return false;
  } catch {
    return false;
  }
}

// Monitor connectivity and update queue state
async function monitorConnectivity() {
  try {
    const isOnline = await checkConnectivity();
    const state = await QueueState.getState();
    
    const wasOffline = !state.isOnline;
    state.isOnline = isOnline;

    if (!isOnline && !wasOffline) {
      console.log('⚠️ Internet connection lost. Pausing email queue...');
      state.isPaused = true;
      state.pausedAt = new Date();
    } else if (isOnline && wasOffline) {
      console.log('✅ Internet connection restored. Resuming email queue...');
      state.isPaused = false;
      state.resumedAt = new Date();
    }

    await state.save();
    return isOnline;
  } catch (error) {
    console.error('Connectivity check error:', error.message);
    return false;
  }
}

// Start monitoring
function startConnectivityMonitor() {
  console.log('🌐 Connectivity monitor started');
  
  // Initial check
  monitorConnectivity();

  // Periodic checks
  checkInterval = setInterval(monitorConnectivity, CHECK_INTERVAL);
}

// Stop monitoring
function stopConnectivityMonitor() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

module.exports = {
  checkConnectivity,
  startConnectivityMonitor,
  stopConnectivityMonitor,
  monitorConnectivity
};
