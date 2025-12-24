class App {
  constructor() {
    this.audio = new AudioEngine();
    this.sequencer = new Sequencer();
    this.pianoRoll = new PianoRoll(this.sequencer, this.audio); // Pass audio for preview
    this.exporter = new MidiExporter();

    this.isPlaying = false;
    this.bpm = 120;

    this.bindEvents();
    this.loop();

    this.loadState();
  }

  saveState() {
    const state = {
      notes: this.sequencer.notes,
      bpm: this.bpm,
      bars: document.getElementById('bar-count').value,
      keyRoot: document.getElementById('key-root').value,
      scaleType: document.getElementById('scale-type').value,
      tone: document.getElementById('tone-select').value,
      duration: document.getElementById('note-duration').value,
      dotted: document.getElementById('note-dotted').checked,
      tool: document.querySelector('input[name="tool"]:checked').value
    };
    localStorage.setItem('melodySketchState', JSON.stringify(state));
  }

  loadState() {
    const json = localStorage.getItem('melodySketchState');
    if (!json) return;
    try {
      const state = JSON.parse(json);

      if (state.bpm) {
        this.bpm = state.bpm;
        document.getElementById('bpm-input').value = state.bpm;
        this.sequencer.setBpm(state.bpm);
      }
      if (state.keyRoot) document.getElementById('key-root').value = state.keyRoot;
      if (state.scaleType) document.getElementById('scale-type').value = state.scaleType;

      // Transient states (Tone, Duration, Tool) are NOT loaded, so they reset to default on reload.
      // User requested default to be 8th note, so we respect HTML defaults.
      /*
      if (state.tone) {
          document.getElementById('tone-select').value = state.tone;
          this.audio.setWaveform(state.tone);
      }
      if (state.duration) document.getElementById('note-duration').value = state.duration;
      if (state.dotted !== undefined) document.getElementById('note-dotted').checked = state.dotted;
      
      if (state.tool) {
        const radio = document.querySelector(`input[name="tool"][value="${state.tool}"]`);
        if (radio) {
          radio.checked = true;
          this.pianoRoll.setToolMode(state.tool);
        }
      }
      */

      // Explicitly set Tone from default (since we commented out loading, ensure it matches HTML default or JS default)
      // Actually HTML default is Triangle, Audio default is Triangle.
      // Duration default is 8th (HTML selected), PianoRoll default is 2.

      // However, we MUST sync the App/PianoRoll state with the HTML defaults right now
      // because PianoRoll is instantiated with defaults, but main.js updateDuration logic needs to run?
      // PianoRoll constructor sets default to 2. HTML sets default to 2. So they match.
      // But Tone? Audio defaults to triangle. HTML defaults to piano? No, we set HTML default to triangle in prev step? 
      // Let's check index.html.

      if (state.notes) {
        this.sequencer.notes = state.notes;
      }

      // Apply derived states
      this.pianoRoll.setKey(
        document.getElementById('key-root').value,
        document.getElementById('scale-type').value
      );
      this.sequencer.setBpm(this.bpm);
      this.updateDuration(); // Sync initial duration from DOM
      this.pianoRoll.draw();

    } catch (e) {
      console.error("Failed to load state", e);
    }
  }

  bindEvents() {
    document.getElementById('rewind-btn').addEventListener('click', () => this.rewind());
    document.getElementById('play-btn').addEventListener('click', () => this.togglePlay());
    document.getElementById('stop-btn').addEventListener('click', () => this.stop());

    // Tool listeners
    document.querySelectorAll('input[name="tool"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.pianoRoll.setToolMode(e.target.value);
        this.saveState();
      });
    });

    document.getElementById('bpm-input').addEventListener('change', (e) => {
      this.bpm = parseInt(e.target.value, 10);
      this.sequencer.setBpm(this.bpm);
      this.saveState();
    });
    document.getElementById('bar-count').addEventListener('change', (e) => {
      const bars = parseInt(e.target.value, 10);
      this.pianoRoll.setBars(bars);
      this.saveState();
    });
    document.getElementById('key-root').addEventListener('change', (e) => {
      this.pianoRoll.setKey(e.target.value, document.getElementById('scale-type').value);
      this.saveState();
    });
    document.getElementById('scale-type').addEventListener('change', (e) => {
      this.pianoRoll.setKey(document.getElementById('key-root').value, e.target.value);
      this.saveState();
    });
    document.getElementById('clear-btn').addEventListener('click', () => {
      if (confirm('Clear all notes?')) {
        this.sequencer.clear();
        localStorage.removeItem('melodySketchState'); // Clear storage
        // Don't saveState() here, or it will overwrite with empty. 
        // Actually we probably DO want to save the empty state? 
        // User asked for "Clear button to be separate".
        // If we save empty state, reload will show empty. That's correct.
        this.saveState();
      }
    });

    // Save on canvas click (note add/remove)
    // Use capture or just bubble? click bubbles.
    document.getElementById('piano-roll-canvas').addEventListener('click', () => {
      // Wait minor tick for PianoRoll callback? PianoRoll handles synchronously.
      this.saveState();
    });

    document.getElementById('export-btn').addEventListener('click', () => {
      this.exporter.export(this.sequencer.notes, this.bpm);
    });

    // Initial set is handled by loadState or defaults, removing redundant calls here might be safer
    // but leaving them doesn't hurt if we loadState after constructor.
    // Actually loadState is called at end of constructor.

    // Update Duration events
    document.getElementById('note-duration').addEventListener('change', (e) => { this.updateDuration(); this.saveState(); });
    document.getElementById('note-dotted').addEventListener('change', (e) => { this.updateDuration(); this.saveState(); });
    document.getElementById('tone-select').addEventListener('change', (e) => {
      this.audio.setWaveform(e.target.value);
      this.saveState();
    });

    window.addEventListener('resize', () => this.pianoRoll.resize());

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Ignore if typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this.sequencer.undo();
        this.pianoRoll.draw();
        this.saveState(); // Save after undo
        return;
      }

      // Rewind: Z (without Ctrl)
      if (e.key === 'z' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault(); // Prevent scrolling or other browser defaults if any
        this.rewind();
        return;
      }

      // Play/Pause: Space
      if (e.code === 'Space') {
        e.preventDefault(); // Prevent scrolling
        this.togglePlay();
        return;
      }

      // Tools: D and E
      if (e.key === 'd' || e.key === 'D') {
        const radio = document.querySelector('input[name="tool"][value="draw"]');
        if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); }
      }
      if (e.key === 'e' || e.key === 'E') {
        const radio = document.querySelector('input[name="tool"][value="erase"]');
        if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); }
      }
    });
  }

  updateDuration() {
    const base = document.getElementById('note-duration').value;
    const dotted = document.getElementById('note-dotted').checked;
    this.pianoRoll.setDuration(base, dotted);
    this.pianoRoll.setDuration(base, dotted);
  }

  rewind() {
    this.sequencer.rewind();
    this.pianoRoll.draw(this.sequencer.currentStep, this.isPlaying);
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  async play() {
    await this.audio.init(); // Ensure context is started
    this.sequencer.init(this.audio.ctx, this.audio.scheduleNote.bind(this.audio));
    this.isPlaying = true;
    this.sequencer.start();
    document.getElementById('play-btn').textContent = '⏸ Pause';
  }

  pause() {
    this.isPlaying = false;
    this.sequencer.stop();
    document.getElementById('play-btn').textContent = '▶ Play';
  }

  stop() {
    this.pause();
    this.sequencer.reset();
  }

  loop() {
    requestAnimationFrame(() => this.loop());

    this.pianoRoll.draw(this.sequencer.currentStep, this.isPlaying);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
