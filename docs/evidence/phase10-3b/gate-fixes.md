# Gate refusals on the first extraction and the fix for each (step 3B)

No rule was changed. Each fix edits extraction.json against source.txt.

## 1. design

| Refusal | Before | After |
|---|---|---|
| design: the quoted passage does not support "rct" | quote: "This single-center, parallel-group RCT was conducted from November 1, 2014, to October 30, 2020." | quote: "After a 2-week habitual sleep period at baseline, participants were randomized to either 2-week sleep extension (sleep extension group) or 2-week continued habitual sleep (control group) (Figure 1)." |

The gate needs the word "randomized" in the design quote; "RCT" alone does not count. The methods sentence that says it replaces the quote. The value stays rct.

## 2. statistical_analysis_itt

| Refusal | Before | After |
|---|---|---|
| fact statistical_analysis_itt: the quote carries a p-value, so it reports a result of this study; use kind "finding" (or "estimate"), not "context" | quote: "An intention-to-treat analysis was conducted in Stata, version 16 (StataCorp LLC) using 2-tailed tests with statistical significance set at P < .05." | quote: "An intention-to-treat analysis was conducted in Stata, version 16 (StataCorp LLC) using 2-tailed tests" |

The P < .05 at the end is the significance threshold, not a result. The quote now stops before it, and the value is "intention-to-treat analysis" (everyone analysed in the group they were randomized to). A first try with the value "intention-to-treat analysis, 2-tailed tests" was refused too: a value must appear inside its quote.

## 3. prior_us_short_sleep

| Refusal | Before | After |
|---|---|---|
| fact prior_us_short_sleep: quote not found in the source: "For example, one-third of the US population reported not getting the r" | quote: "For example, one-third of the US population reported not getting the recommended 7 to 9 hours of sleep per night.,,," | quote: "For example, one-third of the US population reported not getting the recommended 7 to 9 hours of sleep per night." |

The model copied three commas after the full stop (leftover citation markers); the source has two. The quote now ends at the full stop.

