/**
 * Answer input component with keyboard support
 */

"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface AnswerInputProps {
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function AnswerInput({
  onSubmit,
  disabled = false,
  autoFocus = true,
  className,
}: AnswerInputProps) {
  const [answer, setAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);
  
  // Clear input when new question appears
  useEffect(() => {
    setAnswer("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);
  
  const handleSubmit = () => {
    if (answer.trim() && !disabled) {
      onSubmit(answer.trim());
      setAnswer("");
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      className={cn("flex flex-col items-center gap-4", className)}
    >
      {/* Input field */}
      <Input
        ref={inputRef}
        type="number"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="text-center text-3xl font-mono font-bold max-w-md !py-5 leading-none"
        autoComplete="off"
      />
      
      {/* Submit button */}
      <Button
        onClick={handleSubmit}
        disabled={!answer.trim() || disabled}
        variant="primary"
        size="lg"
        className="min-w-[200px]"
      >
        Submit Answer
      </Button>
      
      {/* Keyboard hint */}
      <div className="text-xs text-gray-500">
        Press <kbd className="px-2 py-1 bg-surface rounded border border-border">Enter</kbd> to submit
      </div>
    </motion.div>
  );
}




