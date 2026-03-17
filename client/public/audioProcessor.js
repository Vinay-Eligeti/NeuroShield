/**
 * NeuroShield Audio Processor
 * 
 * converts Float32 to Int16 for backend efficiency.
 */
class NeuroShieldAudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      const i16Buffer = new Int16Array(channelData.length);
      
      for (let i = 0; i < channelData.length; i++) {
        // Clamp and scale to Int16
        const s = Math.max(-1, Math.min(1, channelData[i]));
        i16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      this.port.postMessage(i16Buffer.buffer, [i16Buffer.buffer]);
    }
    return true;
  }
}

registerProcessor('neuroshield-audio-processor', NeuroShieldAudioProcessor);
