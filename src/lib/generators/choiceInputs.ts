import type { BinaryChoiceAnswerInput } from "@/types/core";

export const PARITY_BINARY_INPUT: BinaryChoiceAnswerInput = {
  type: "binary-choice",
  choices: [
    { id: "even", label: "Even" },
    { id: "odd", label: "Odd" },
  ],
};

export const YES_NO_BINARY_INPUT: BinaryChoiceAnswerInput = {
  type: "binary-choice",
  choices: [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ],
  showHintOnIncorrect: true,
};
