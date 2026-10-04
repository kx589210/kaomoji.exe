// THE SLOT's home geometry (build sheet notes/bid2/drop2-sheet2.md §4.4; design §4.4): the box and row 1's title and avatar, where
// the switch's DEFENDER v2.0 lands from its top-left slam (drop2Switch.ts titleAt) and the scoreboard takes over on the box's clang
// (drop2SwitchSlot.ts). Its own module, with no imports, so the switch reads it without pulling in the parts the slot docks around.
// Layout px (top-left origin, y down).

/** The box at home: x 48–808, y 822–1032 (#0C0F0E at 94 %, a 2 px #FF4A1C frame). */
export const SLOT_BOX = { x0: 48, y0: 822, x1: 808, y1: 1032 } as const;
/** Row 1's title (Inter Tight Black 44 px, red): its left x, centre y, size. */
export const SLOT_TITLE = { x: SLOT_BOX.x0 + 24, y: SLOT_BOX.y0 + 42, size: 44 } as const;
/** Row 1's avatar (Noto Sans JP 64 px): its left x, centre y, size — the clean (￣▽￣) flies down with the title. */
export const SLOT_AVATAR = { x: SLOT_BOX.x0 + 376, y: SLOT_BOX.y0 + 42, size: 64 } as const;
