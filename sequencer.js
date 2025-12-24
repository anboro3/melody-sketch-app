class Sequencer {
  constructor() {
    this.notes = [];
    this.bpm = 120;
    this.current16thNote = 0;
    this.nextNoteTime = 0.0; // When the next note is due.
    this.scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)
    this.lookahead = 25.0; // How frequently to call scheduling (ms)
    this.timerID = null;

    // Visual
    this.currentStep = 0;

    // Audio Callback
    this.onSchedule = null; // (pitch, start, duration) => void
    this.audioCtx = null; // Need this for currentTime

    // History
    this.history = [];
  }

  setBpm(bpm) {
    this.bpm = bpm;
  }

  _pushState() {
    // Limit history size? 50
    if (this.history.length > 50) this.history.shift();
    // Deep copy notes
    this.history.push(JSON.parse(JSON.stringify(this.notes)));
  }

  undo() {
    if (this.history.length === 0) return;
    this.notes = this.history.pop();
  }

  // Note Management
  addNote(pitch, start, duration = 4) {
    this._pushState();
    // Simple overwrite:
    this.removeNoteAt(pitch, start, false); // Don't push state on internal remove
    this.notes.push({ pitch, start, duration });
  }

  removeNoteAt(pitch, step, pushState = true) {
    if (pushState) this._pushState();
    this.notes = this.notes.filter(n => !(n.pitch === pitch && n.start === step));
  }

  getNotesAtStep(step) {
    return this.notes.filter(n => n.start === step);
  }

  clear() {
    this._pushState();
    this.notes = [];
  }

  // Playback
  start() {
    this.current16thNote = 0;
    if (this.audioCtx) {
      this.nextNoteTime = this.audioCtx.currentTime + 0.1;
      this.scheduler();
    }
  }

  stop() {
    if (this.timerID) clearTimeout(this.timerID);
  }

  reset() {
    this.current16thNote = 0;
    this.currentStep = 0;
  }

  rewind() {
    this.current16thNote = 0;
    this.currentStep = 0;
    if (this.audioCtx) {
      this.nextNoteTime = this.audioCtx.currentTime + 0.1;
    }
  }

  nextNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th note

    this.current16thNote++;
    if (this.current16thNote === 16 * 4) { // 4 bars wrap
      this.current16thNote = 0;
    }
  }

  scheduler() {
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.scheduleNotesInStep(this.current16thNote, this.nextNoteTime);
      this.nextNote();
    }
    this.timerID = setTimeout(() => this.scheduler(), this.lookahead);

    // Update visual step (approximate)
    this.currentStep = this.current16thNote;
  }

  scheduleNotesInStep(step, time) {
    const notes = this.getNotesAtStep(step);
    notes.forEach(note => {
      const freq = 440 * Math.pow(2, (note.pitch - 69) / 12);
      const durationSec = (60 / this.bpm) * (note.duration / 4);

      if (this.onSchedule) {
        this.onSchedule(freq, time, durationSec);
      }
    });
  }

  init(audioCtx, onSchedule) {
    this.audioCtx = audioCtx;
    this.onSchedule = onSchedule;
  }
}
