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
}
export const GAMES: readonly GameDefinition[] = [
  {id:"balloon-pop", title:"풍선 터뜨리기", tagline:"온몸으로 팡팡!",
   description:"화면에 나타나는 풍선을 손·발·머리로 터뜨려 점수를 획득하세요.",
   category:"touch", status:"available", duration:"60초", bodyParts:"손 · 발 · 머리",
   artwork:"balloons", emoji:"🎈"},
  {id:"fruit-catch", title:"과일 바구니", tagline:"떨어지는 과일을 잡아라!",
   description:"움직임으로 가상의 바구니를 옮겨 떨어지는 과일을 받아 보세요.",
   category:"catch", status:"coming-soon", duration:"미정", bodyParts:"양손",
   artwork:"fruit", emoji:"🍎"},
  {id:"pose-challenge", title:"포즈 챌린지", tagline:"동작을 따라 해 보세요!",
   description:"화면에 나타나는 목표 자세를 따라 하며 즐기는 모션 게임.",
   category:"pose", status:"coming-soon", duration:"미정", bodyParts:"온몸",
   artwork:"pose", emoji:"🕺"}
] as const;
export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find(game => game.id === id);
}
export const CATEGORY_LABELS: Record<GameCategory, string> = {
  touch:"터치", catch:"받기", pose:"리듬 / 포즈"
};
