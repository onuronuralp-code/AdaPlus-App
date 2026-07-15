import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SoundManager {
  private sounds: Record<string, Audio.Sound> = {};
  private soundEnabled: boolean = true;

  constructor() {
    this.init();
  }

  private async init() {
    const val = await AsyncStorage.getItem('sound_enabled');
    if (val !== null) {
      this.soundEnabled = val === 'true';
    }
  }

  public async setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    await AsyncStorage.setItem('sound_enabled', enabled ? 'true' : 'false');
  }

  public getSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public async play(noteModule: any) {
    if (!this.soundEnabled) return;

    try {
      const key = typeof noteModule === 'number' ? noteModule.toString() : String(noteModule);
      
      if (!this.sounds[key]) {
        const { sound } = await Audio.Sound.createAsync(noteModule);
        this.sounds[key] = sound;
      }

      await this.sounds[key].replayAsync();
    } catch (e) {
      console.log('Error playing note via SoundManager:', e);
    }
  }
}

export const soundManager = new SoundManager();
