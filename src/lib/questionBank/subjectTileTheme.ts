/**
 * Question bank home card colors.
 *
 * Dark mode (html.dark): start + progress fill = LIGHT hue; subtext + progress track = DARK hue.
 * Light mode: inverted.
 * Card titles use neutral `text-text` in QuestionBankHomeScreen.
 */

export const SUBJECT_TILE_STYLES = {
  "Math 1": {
    topicClass: "text-[#91b4a4] dark:text-[#4b6b64]",
    statClass: "text-[#91b4a4] dark:text-[#4b6b64]",
    progressFillClass: "bg-[#4b6b64] dark:bg-[#91b4a4]",
    progressTrackClass: "bg-[#91b4a4] dark:bg-[#4b6b64]",
    startBtnClass: "bg-[#4b6b64] dark:bg-[#91b4a4] text-background hover:opacity-90",
  },
  "Math 2": {
    topicClass: "text-[#eaaf40] dark:text-[#8d6741]",
    statClass: "text-[#eaaf40] dark:text-[#8d6741]",
    progressFillClass: "bg-[#8d6741] dark:bg-[#eaaf40]",
    progressTrackClass: "bg-[#eaaf40] dark:bg-[#8d6741]",
    startBtnClass: "bg-[#8d6741] dark:bg-[#eaaf40] text-background hover:opacity-90",
  },
  Physics: {
    topicClass: "text-[#af6da1] dark:text-[#623e56]",
    statClass: "text-[#af6da1] dark:text-[#623e56]",
    progressFillClass: "bg-[#623e56] dark:bg-[#af6da1]",
    progressTrackClass: "bg-[#af6da1] dark:bg-[#623e56]",
    startBtnClass: "bg-[#623e56] dark:bg-[#af6da1] text-background hover:opacity-90",
  },
  Chemistry: {
    topicClass: "text-[#cf5b5b] dark:text-[#7c3942]",
    statClass: "text-[#cf5b5b] dark:text-[#7c3942]",
    progressFillClass: "bg-[#7c3942] dark:bg-[#cf5b5b]",
    progressTrackClass: "bg-[#cf5b5b] dark:bg-[#7c3942]",
    startBtnClass: "bg-[#7c3942] dark:bg-[#cf5b5b] text-background hover:opacity-90",
  },
  Biology: {
    topicClass: "text-[#a9b167] dark:text-[#69724b]",
    statClass: "text-[#a9b167] dark:text-[#69724b]",
    progressFillClass: "bg-[#69724b] dark:bg-[#a9b167]",
    progressTrackClass: "bg-[#a9b167] dark:bg-[#69724b]",
    startBtnClass: "bg-[#69724b] dark:bg-[#a9b167] text-background hover:opacity-90",
  },
  "Paper 1": {
    topicClass: "text-[#c4bec9] dark:text-[#5b5661]",
    statClass: "text-[#c4bec9] dark:text-[#5b5661]",
    progressFillClass: "bg-[#5b5661] dark:bg-[#c4bec9]",
    progressTrackClass: "bg-[#c4bec9] dark:bg-[#5b5661]",
    startBtnClass: "bg-[#5b5661] dark:bg-[#c4bec9] text-background hover:opacity-90",
  },
  "Paper 2": {
    topicClass: "text-[#c4bec9] dark:text-[#5b5661]",
    statClass: "text-[#c4bec9] dark:text-[#5b5661]",
    progressFillClass: "bg-[#5b5661] dark:bg-[#c4bec9]",
    progressTrackClass: "bg-[#c4bec9] dark:bg-[#5b5661]",
    startBtnClass: "bg-[#5b5661] dark:bg-[#c4bec9] text-background hover:opacity-90",
  },
} as const;
