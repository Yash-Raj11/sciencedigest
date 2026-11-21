/**
 * The carousel art kit: poster-style pictures drawn in code, separate from the article figures.
 * Big shapes, one idea each. Every component is called as a function (Satori checks the tree),
 * holds no number of its own outside geometry, and draws a claim solid orange when the paper
 * measured it and dashed ink when it is the authors' explanation.
 */

import type { CarouselPicture } from "../../content/types";
import type { Palette } from "../tokens";
import type { Line } from "./line";
import { Doorbell } from "./Doorbell";
import { Ledger } from "./Ledger";
import { ParkingSpot } from "./ParkingSpot";
import { Ramp } from "./Ramp";
import { TwoPiles } from "./TwoPiles";

export const PICTURES: Record<CarouselPicture, (p: { line: Line; width?: number; pal?: Palette }) => React.JSX.Element> = {
  "parking-spot": ParkingSpot,
  "two-piles": TwoPiles,
  ledger: Ledger,
  ramp: Ramp,
  doorbell: Doorbell,
};

export { Day } from "./Day";
export { Interval } from "./Interval";
export { VerdictMark } from "./Marks";
export { Plateau } from "./Plateau";
export { Shrink } from "./Sketch";
