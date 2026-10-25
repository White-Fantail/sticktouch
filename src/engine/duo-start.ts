/** Start a two-player game only after both players are freshly tracked again.
 * A mouse click can queue the start while somebody has stepped toward the screen. */
export const DUO_START_STABLE_MS=350;
export function updateQueuedDuoStart(visibleSince:number|null,requested:boolean,
  bothFresh:boolean,now:number):{visibleSince:number|null;ready:boolean}{
  if(!requested||!bothFresh||!Number.isFinite(now))
    return {visibleSince:null,ready:false};
  const since=visibleSince??now;
  return {visibleSince:since,ready:now-since>=DUO_START_STABLE_MS};
}
