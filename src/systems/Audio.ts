import * as Phaser from "phaser";
import { AUDIO_BASE_PATH, MUSIC, SFX, sfxKey, type MusicId, type SfxId } from "../data/audioManifest.ts";
import { AUDIO_PREF_KEY, mayRepeat, musicFor, parseMuted, pitchJitter, serializeMuted, type MusicContext } from "../logic/audio.ts";
import { browserStorage } from "./HighScoreStore.ts";

const REGISTRY_KEY = "gameAudio";
const FADE_MS = 450;
const FADE_STEPS = 9;

/** Queues every effect for loading (music is streamed later, never preloaded). */
export function queueAudio(scene: Phaser.Scene): void {
  for (const [id, s] of Object.entries(SFX) as [SfxId, (typeof SFX)[SfxId]][]) scene.load.audio(sfxKey(id), AUDIO_BASE_PATH + s.file);
}

/**
 * One per game (kept in the registry, so scene restarts share it). Effects
 * play through Phaser's sound manager; music streams through a single HTML
 * audio element and crossfades between tracks. Missing files, a blocked
 * audio context or blocked storage never stop the game: it just stays quiet.
 */
export class GameAudio {
  private muted: boolean;
  private readonly lastPlayed = new Map<SfxId, number>();
  private music: HTMLAudioElement | null = null;
  private musicId: MusicId | null = null;
  /** A track the browser refused to start before the first click or key press. */
  private pendingStart = false;

  private constructor(private readonly game: Phaser.Game) {
    let saved: string | null = null;
    try {
      saved = browserStorage()?.getItem(AUDIO_PREF_KEY) ?? null;
    } catch {
      saved = null;
    }
    this.muted = parseMuted(saved);
    this.game.sound.mute = this.muted;
    // Browsers only allow audio after a user gesture: retry a refused track then.
    const unlock = (): void => {
      if (this.pendingStart) this.startMusic();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    // The game freezes in a hidden tab; the music should too.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.music?.pause();
      else if (this.music && !this.muted) this.startMusic();
    });
  }

  static of(game: Phaser.Game): GameAudio {
    const existing: unknown = game.registry.get(REGISTRY_KEY);
    if (existing instanceof GameAudio) return existing;
    const audio = new GameAudio(game);
    game.registry.set(REGISTRY_KEY, audio);
    return audio;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Plays an effect (skipped while muted, if its file is missing, or if it repeats too fast). */
  sfx(id: SfxId, opts: { readonly jitter?: boolean; readonly volume?: number } = {}): void {
    if (this.muted) return;
    const def: (typeof SFX)[SfxId] = SFX[id];
    const now = performance.now();
    if (!mayRepeat(this.lastPlayed.get(id), now, "minGapMs" in def ? def.minGapMs : undefined)) return;
    const key = sfxKey(id);
    if (!this.game.cache.audio.exists(key)) return;
    this.lastPlayed.set(id, now);
    try {
      this.game.sound.play(key, { volume: def.volume * (opts.volume ?? 1), detune: opts.jitter ? pitchJitter(Math.random()) : 0 });
    } catch {
      // A sound that cannot play is not worth a crash.
    }
  }

  /** Switches the music to the track for this moment (no-op if it is already playing). */
  setMusic(ctx: MusicContext): void {
    this.playMusic(musicFor(ctx));
  }

  playMusic(id: MusicId | null): void {
    if (id === this.musicId) return;
    const old = this.music;
    if (old) this.fade(old, old.volume, 0, () => old.pause());
    this.musicId = id;
    this.music = null;
    if (!id) return;
    const el = new Audio(AUDIO_BASE_PATH + MUSIC[id].file);
    el.loop = true;
    el.preload = "auto";
    el.volume = 0;
    this.music = el;
    this.startMusic();
  }

  /** M key: sound on or off, remembered in this browser. */
  toggleMute(): boolean {
    this.muted = !this.muted;
    this.game.sound.mute = this.muted;
    try {
      browserStorage()?.setItem(AUDIO_PREF_KEY, serializeMuted(this.muted));
    } catch {
      // Not saved; it still applies for this session.
    }
    const el = this.music;
    if (el && this.musicId) {
      if (this.muted) el.volume = 0;
      else {
        el.volume = MUSIC[this.musicId].volume;
        if (el.paused) this.startMusic();
      }
    }
    return this.muted;
  }

  private startMusic(): void {
    const el = this.music;
    const id = this.musicId;
    if (!el || !id) return;
    this.pendingStart = false;
    el.play().then(
      () => {
        if (this.music === el && !this.muted) this.fade(el, el.volume, MUSIC[id].volume);
      },
      () => {
        // Refused before a user gesture (or the file failed): try again on the next one.
        if (this.music === el) this.pendingStart = true;
      },
    );
  }

  private fade(el: HTMLAudioElement, from: number, to: number, done?: () => void): void {
    let step = 0;
    const timer = window.setInterval(() => {
      step++;
      el.volume = Math.min(1, Math.max(0, from + ((to - from) * step) / FADE_STEPS));
      if (step >= FADE_STEPS) {
        window.clearInterval(timer);
        done?.();
      }
    }, FADE_MS / FADE_STEPS);
  }
}
