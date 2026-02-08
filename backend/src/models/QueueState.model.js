const mongoose = require('mongoose');

// Singleton document to track queue state across restarts
const queueStateSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'queue-state'
  },
  isOnline: {
    type: Boolean,
    default: true
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  pausedAt: Date,
  resumedAt: Date,
  lastProcessedAt: Date,
  emailsSentThisHour: {
    type: Number,
    default: 0
  },
  hourStartedAt: Date,
  processedToday: {
    type: Number,
    default: 0
  },
  todayDate: String,
  errorCount: {
    type: Number,
    default: 0
  },
  lastError: String,
  lastErrorAt: Date
});

queueStateSchema.statics.getState = async function() {
  let state = await this.findById('queue-state');
  if (!state) {
    state = await this.create({ _id: 'queue-state' });
  }
  return state;
};

queueStateSchema.statics.resetHourlyCount = async function() {
  const state = await this.getState();
  const now = new Date();
  const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  
  if (!state.hourStartedAt || state.hourStartedAt < hourStart) {
    state.emailsSentThisHour = 0;
    state.hourStartedAt = hourStart;
    await state.save();
  }
  return state;
};

queueStateSchema.statics.resetDailyCount = async function() {
  const state = await this.getState();
  const today = new Date().toDateString();
  
  if (state.todayDate !== today) {
    state.processedToday = 0;
    state.todayDate = today;
    await state.save();
  }
  return state;
};

module.exports = mongoose.model('QueueState', queueStateSchema);
