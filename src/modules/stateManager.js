const state = {
  currentStep: 1,
  files: [],
  processSettings: {
    mode: 'auto',
    precision: 'medium',
  },
  namingTemplate: '{name}',
  namingConfig: {
    startIndex: 1,
    digitCount: 3,
  },
  selectedIds: new Set(),
  isProcessing: false,
  processedCount: 0,
  totalToProcess: 0,
};

const listeners = new Map();

export function getState() {
  return state;
}

export function setState(updates) {
  Object.assign(state, updates);
  notify('stateChanged', state);
}

export function subscribe(event, callback) {
  if (!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(callback);
}

export function unsubscribe(event, callback) {
  if (listeners.has(event)) {
    listeners.set(event, listeners.get(event).filter(cb => cb !== callback));
  }
}

export function notify(event, data) {
  if (listeners.has(event)) {
    for (const cb of listeners.get(event)) {
      cb(data);
    }
  }
}

export function addFile(fileItem) {
  state.files.push(fileItem);
  state.selectedIds.add(fileItem.id);
  notify('filesChanged', state.files);
}

export function removeFile(id) {
  state.files = state.files.filter(f => f.id !== id);
  state.selectedIds.delete(id);
  notify('filesChanged', state.files);
}

export function clearFiles() {
  state.files = [];
  state.selectedIds.clear();
  notify('filesChanged', state.files);
}

export function updateFile(id, updates) {
  const file = state.files.find(f => f.id === id);
  if (file) {
    Object.assign(file, updates);
    notify('fileUpdated', file);
  }
}

export function getFile(id) {
  return state.files.find(f => f.id === id);
}

export function setStep(step) {
  state.currentStep = step;
  notify('stepChanged', step);
}

export function toggleFileSelection(id) {
  if (state.selectedIds.has(id)) {
    state.selectedIds.delete(id);
  } else {
    state.selectedIds.add(id);
  }
  notify('selectionChanged', state.selectedIds);
}

export function selectAllFiles() {
  state.selectedIds = new Set(state.files.map(f => f.id));
  notify('selectionChanged', state.selectedIds);
}

export function deselectAllFiles() {
  state.selectedIds.clear();
  notify('selectionChanged', state.selectedIds);
}
