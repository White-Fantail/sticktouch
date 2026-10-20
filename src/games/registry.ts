import type {GameFeelProfile} from "../engine/game-feel";
import type {MusicTheme} from "../engine/audio";
export type GameCategory = "touch" | "catch" | "pose";
export type GameStatus = "available" | "coming-soon";
export interface GameDefinition {
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: GameCategory;
  status: GameStatus;
  duration: string;
  bodyParts: string;
  artwork: string;
  emoji: string;
  /** Shared platform feedback theme and optional per-game scoring profile. */
  feedback: {musicTheme: MusicTheme; scoreProfile?:GameFeelProfile};
}
export const GAMES: readonly GameDefinition[] = [
  {id:"balloon-pop", title:"풍선 터뜨리기", tagline:"온몸으로 팡팡!",
   description:"화면에 나타나는 풍선을 손·발·머리로 터뜨려 점수를 획득하세요.",
   category:"touch", status:"available", duration:"60초", bodyParts:"손 · 발 · 머리",
   artwork:"balloons", emoji:"🎈", feedback:{musicTheme:"pop"}},
  {id:"fruit-catch", title:"과일 바구니", tagline:"떨어지는 과일을 잡아라!",
   description:"하단 카메라에 비친 손으로 바구니를 움직여 과일을 받고, 폭탄은 피하세요.",
   category:"catch", status:"available", duration:"60초", bodyParts:"양손",
   artwork:"fruit", emoji:"🍎", feedback:{musicTheme:"fruit"}},
  {id:"pose-challenge", title:"포즈 챌린지", tagline:"동작을 따라 해 보세요!",
   description:"다섯 가지 목표 자세를 따라 하고 0.85초 유지해 콤보를 이어 가세요.",
   category:"pose", status:"available", duration:"60초", bodyParts:"온몸",
   artwork:"pose", emoji:"🕺", feedback:{musicTheme:"rhythm"}}
] as const;
export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find(game => game.id === id);
}
export const CATEGORY_LABELS: Record<GameCategory, string> = {
  touch:"터치", catch:"받기", pose:"리듬 / 포즈"
};
