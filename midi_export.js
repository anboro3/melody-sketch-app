class MidiExporter {
  constructor() {
  }

  export(notes, bpm) {
    // Simple MIDI Writer implementation
    // Header Chunk
    // MThd
    const header = [
      0x4D, 0x54, 0x68, 0x64, // MThd
      0x00, 0x00, 0x00, 0x06, // Length 6
      0x00, 0x00, // Format 0 (single track)
      0x00, 0x01, // 1 Track
      0x01, 0xE0  // Division: 480 ticks per beat (standard)
    ];

    // Track Chunk
    // MTrk
    const trackEvents = [];
    const PPQ = 480;

    // Set Tempo
    // Meta event 0xFF 0x51 0x03 [tt tt tt]
    // microseconds per quarter note
    const microsPerBeat = Math.round(60000000 / bpm);
    trackEvents.push(
      0x00, // Delta time 0
      0xFF, 0x51, 0x03,
      (microsPerBeat >> 16) & 0xFF,
      (microsPerBeat >> 8) & 0xFF,
      (microsPerBeat) & 0xFF
    );

    // Convert notes to events
    // Note On: 0x90, Note, Vel
    // Note Off: 0x80, Note, Vel

    // We need to sort all events by time
    const events = [];
    notes.forEach(note => {
      // Start time in ticks
      // note.start is in 16th notes.
      // 1 beat = 480 ticks. 16th note = 120 ticks.
      const startTicks = note.start * 120;
      const endTicks = (note.start + note.duration) * 120;

      events.push({
        tick: startTicks,
        type: 0x90,
        pitch: note.pitch,
        velocity: 100
      });
      events.push({
        tick: endTicks,
        type: 0x80,
        pitch: note.pitch,
        velocity: 0
      });
    });

    // Sort by tick
    events.sort((a, b) => a.tick - b.tick);

    // Calculate Delta times
    let currentTick = 0;
    let diffBytes = [];

    events.forEach(e => {
      const delta = e.tick - currentTick;
      currentTick = e.tick;

      // Write VQ (Variable Quantity) for delta
      trackEvents.push(...this.toVarLen(delta));

      // Event
      // Channel 0
      trackEvents.push(e.type, e.pitch, e.velocity);
    });

    // End of Track
    // Delta 0, Meta 0x2F 0x00
    trackEvents.push(0x00, 0xFF, 0x2F, 0x00);

    // Construct full file
    // Track Header
    const trackHeader = [
      0x4D, 0x54, 0x72, 0x6B, // MTrk
      // Length (4 bytes)
    ];

    const length = trackEvents.length;
    trackHeader.push(
      (length >> 24) & 0xFF,
      (length >> 16) & 0xFF,
      (length >> 8) & 0xFF,
      (length) & 0xFF
    );

    const fileData = new Uint8Array([...header, ...trackHeader, ...trackEvents]);

    // Download
    const blob = new Blob([fileData], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'melody_sketch.mid';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  toVarLen(value) {
    const buffer = [];
    let v = value;
    buffer.push(v & 0x7F);
    while ((v >>= 7) > 0) {
      buffer.unshift((v & 0x7F) | 0x80);
    }
    return buffer;
  }
}
