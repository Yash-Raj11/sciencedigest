/**
 * The companion's mood. Pure.
 *
 * It reflects WHAT YOU DID today and how many days running you showed up.
 * It never reflects your body or your health: ticks cannot know that (rule H8).
 * There is no sick, sad or dying state. The lowest it goes is asleep.
 */

export type Mood = "resting" | "waiting" | "alert" | "lively" | "glowing";

export interface MoodInput {
  /** Today's daily boxes ticked, and how many there are. */
  done: number;
  total: number;
  streak: number;
}

export function moodOf({ done, total, streak }: MoodInput): Mood {
  if (total > 0 && done >= total) return "glowing";
  if (done > 0 && done * 2 >= total) return "lively";
  if (done > 0) return "alert";
  return streak > 0 ? "waiting" : "resting";
}

/** What the companion says. Always a plain statement of what was logged. */
export function lineFor(mood: Mood, { done, total, streak }: MoodInput): string {
  const left = total - done;
  const days = `${streak} ${streak === 1 ? "day" : "days"} running`;
  switch (mood) {
    case "glowing": return streak > 1 ? `Everything for today is done. ${days}.` : "Everything for today is done.";
    case "lively": return `${done} of ${total} done. ${left} to go.`;
    case "alert": return `${done} of ${total} done. A start.`;
    case "waiting": return total > 0 ? `Nothing ticked yet today. ${days} so far.` : `${days} so far.`;
    case "resting": return total > 0 ? "Asleep until the first tick of the day." : "Add a habit or a protocol and I wake up.";
  }
}
