import AsyncStorage from '@react-native-async-storage/async-storage';

class SoundManager {
  private soundEnabled: boolean = true;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const val = await AsyncStorage.getItem('sound_enabled');
      if (val !== null) {
        this.soundEnabled = val === 'true';
      }
    } catch {}
  }

  public async setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      await AsyncStorage.setItem('sound_enabled', enabled ? 'true' : 'false');
    } catch {}
  }

  public getSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public async play(_noteModule?: any) {
    // no-op without expo-av
  }
}

export const soundManager = new SoundManager();
