/**
 * The sleep read's metaphor: weight as a ledger with two columns, food in and energy burned.
 * The measured result is in the left column: intake fell (the top entry, outlined, with the
 * arrow). The right column is drawn unchanged, because burned energy showed no clear difference.
 * Entries are all one size: the art shows which column moved, never by how much.
 */

import { paletteOf } from "../palettes";
import { ART, type Palette } from "../tokens";
import { LEDGER_ROWS } from "../art-geometry";
import { claim, scenery, solidInk, type Line } from "./line";

export function Ledger({ line, width = ART.width, pal = paletteOf("dark") }: { line: Line; width?: number; pal?: Palette }) {
  return (
    <svg width={width} height={Math.round((width * ART.height) / ART.width)} viewBox={`0 0 ${ART.width} ${ART.height}`}>
      <rect x={72} y={30} width={760} height={560} rx={28} {...solidInk(pal)} fill={pal.surface} />
      <path d="M 452 70 L 452 550" {...scenery(pal)} />
      <circle cx={262} cy={120} r={46} {...scenery(pal)} />
      <circle cx={262} cy={120} r={22} {...scenery(pal)} />
      <path d="M 642 160 C 590 150, 600 100, 642 70 C 684 100, 694 150, 642 160 Z" {...scenery(pal)} />
      {LEDGER_ROWS.map((row) => (
        <rect key={`in-${row.key}`} x={142} y={row.y} width={240} height={52} rx={12}
          {...(row.top ? claim(line, pal) : solidInk(pal))} fill={row.top ? "none" : pal.raised} />
      ))}
      {LEDGER_ROWS.map((row) => (
        <rect key={`out-${row.key}`} x={522} y={row.y} width={240} height={52} rx={12} {...solidInk(pal)} />
      ))}
      <path d="M 410 210 L 410 300 M 385 275 L 410 300 L 435 275" {...claim(line, pal)} />
    </svg>
  );
}
