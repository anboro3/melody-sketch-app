class PianoRoll {
  constructor(sequencer, audio) {
    this.sequencer = sequencer;
    this.audio = audio;
    this.canvas = document.getElementById('piano-roll-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Config
    this.cellWidth = 40; // Pixels per 16th note
    this.cellHeight = 30; // Pixels per pitch
    this.startPitch = 96; // C7
    this.endPitch = 12; // C0
    this.numPitches = this.startPitch - this.endPitch + 1;
    this.numSteps = 64; // 4 bars * 16 steps

    this.keyRoot = 'C';
    this.scaleType = 'major';

    // Duration state
    this.currentBaseDuration = 2; // 16th notes count (2 = 8th)
    this.isDotted = false;

    this.toolMode = 'draw'; // 'draw' | 'erase'

    this.resize();
    this.bindEvents();
  }

  setToolMode(mode) {
    this.toolMode = mode;
  }

  setBars(numBars) {
    this.numSteps = numBars * 16;
    this.resize();
  }

  setDuration(base, isDotted) {
    this.currentBaseDuration = parseInt(base, 10);
    this.isDotted = isDotted;
  }

  setKey(root, type) {
    this.keyRoot = root;
    this.scaleType = type;
    this.draw(); // Redraw grid with new greyed out areas
  }

  resize() {
    // Adjust canvas size to fit grid content
    this.canvas.width = this.numSteps * this.cellWidth;
    this.canvas.height = this.numPitches * this.cellHeight;
    this.draw();
  }

  bindEvents() {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
  }

  async handleClick(e) {
    // Ensure audio context is running on user interaction
    await this.audio.init();

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const step = Math.floor(x / this.cellWidth);
    const pitchIndex = Math.floor(y / this.cellHeight);
    const pitch = this.startPitch - pitchIndex;

    // Toggle based on Tool Mode
    const existingNote = this.sequencer.notes.find(n => n.pitch === pitch && n.start === step);

    if (this.toolMode === 'erase') {
      if (existingNote) {
        this.sequencer.removeNoteAt(pitch, step);
      }
    } else {
      // Draw Mode
      if (existingNote) {
        // In Draw mode, maybe we strictly only add? 
        // Or if existing, do nothing?
        // User requested "Pencil/Eraser separate". 
        // Usually Pencil on existing note might edit it, but here we just safely ignore or replace.
        // Let's prevent deletion in Draw mode.
        // If user wants to replace, they should erase first or we can implement replace logic.
        // For now: Do nothing if exists.
      } else {
        // Play preview
        const freq = 440 * Math.pow(2, (pitch - 69) / 12);
        this.audio.scheduleNote(freq, this.audio.getCurrentTime(), 0.1);

        // Calculate duration
        let duration = this.currentBaseDuration;
        if (this.isDotted) {
          duration = duration * 1.5;
        }

        this.sequencer.addNote(pitch, step, duration);
      }
    }

    this.draw();
  }

  draw(currentStep = -1, isPlaying = false) {
    // Clear
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Grid
    for (let s = 0; s < this.numSteps; s++) {
      const x = s * this.cellWidth;

      // Highlight beats (every 4 steps)
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.strokeStyle = (s % 4 === 0) ? '#444' : '#2a2a2a';
      this.ctx.stroke();
    }

    // Horizontal lines & Scale highlighting
    for (let p = 0; p < this.numPitches; p++) {
      const pitch = this.startPitch - p;
      const y = p * this.cellHeight;
      const isInScale = isNoteInScale(pitch, this.keyRoot, this.scaleType);

      if (!isInScale) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Darken out of scale
        this.ctx.fillRect(0, y, this.canvas.width, this.cellHeight);
      } else {
        // Highlight root note optionally?
        // if (pitch % 12 === NOTE_NAMES.indexOf(this.keyRoot)) ...
      }

      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.strokeStyle = '#2a2a2a';
      this.ctx.stroke();

      // Draw Label for every note
      const noteName = getNoteName(pitch);
      this.ctx.fillStyle = '#888';
      this.ctx.font = '10px sans-serif';
      this.ctx.fillText(noteName, 2, y + 15);
    }

    // Draw Notes
    this.sequencer.notes.forEach(note => {
      const x = note.start * this.cellWidth;
      const pitchIndex = this.startPitch - note.pitch;
      const y = pitchIndex * this.cellHeight;
      const w = note.duration * this.cellWidth;

      // Check visibility
      if (y >= 0 && y < this.canvas.height) {
        this.ctx.fillStyle = 'rgba(187, 134, 252, 0.7)'; // Semi-transparent for overlaps
        this.ctx.fillRect(x + 1, y + 1, w - 2, this.cellHeight - 2);
      }
    });

    // Playhead
    if (currentStep >= 0) {
      const x = currentStep * this.cellWidth;
      this.ctx.fillStyle = 'rgba(3, 218, 198, 0.3)';
      this.ctx.fillRect(x, 0, this.cellWidth, this.canvas.height);
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.strokeStyle = '#03dac6';
      this.ctx.stroke();
    }
  }
}
