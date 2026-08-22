"use client";

import { createContext, useContext } from "react";
import type { ConverterExam } from "@/lib/scoreConverter/esatModules";

export type ApplyTableSelection = (selection: {
  exam: ConverterExam;
  year: number;
  paperName: string;
  partName: string;
}) => void;

const ScoreConverterContext = createContext<{
  applyTableSelection?: ApplyTableSelection;
}>({});

export function ScoreConverterProvider({
  applyTableSelection,
  children,
}: {
  applyTableSelection: ApplyTableSelection;
  children: React.ReactNode;
}) {
  return (
    <ScoreConverterContext.Provider value={{ applyTableSelection }}>
      {children}
    </ScoreConverterContext.Provider>
  );
}

export function useScoreConverterActions() {
  return useContext(ScoreConverterContext);
}
