"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ChevronRight, RotateCcw, Brain } from "lucide-react";
import type { QuizData, QuizQuestion } from "@/lib/ai/quiz";

interface QuizDisplayProps {
  quiz: QuizData;
  onClose: () => void;
}

export function QuizDisplay({ quiz, onClose }: QuizDisplayProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    new Array(quiz.questions.length).fill(null)
  );
  const [showResults, setShowResults] = useState(false);

  const question: QuizQuestion = quiz.questions[currentQuestion];
  const selectedAnswer = selectedAnswers[currentQuestion];
  const hasAnswered = selectedAnswer !== null;

  const handleAnswer = (optionIndex: number) => {
    if (hasAnswered) return;
    const updated = [...selectedAnswers];
    updated[currentQuestion] = optionIndex;
    setSelectedAnswers(updated);
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion((q) => q + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleReset = () => {
    setCurrentQuestion(0);
    setSelectedAnswers(new Array(quiz.questions.length).fill(null));
    setShowResults(false);
  };

  const score = selectedAnswers.filter(
    (ans, i) => ans === quiz.questions[i].correctIndex
  ).length;

  if (showResults) {
    return (
      <ResultsView
        score={score}
        total={quiz.questions.length}
        topic={quiz.topic}
        onReset={handleReset}
        onClose={onClose}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full glass-card rounded-xl p-6 border border-primary/20 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Test Your Knowledge</h3>
            <p className="text-xs text-muted-foreground">{quiz.topic}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-mono">
            {currentQuestion + 1} / {quiz.questions.length}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors"
            title="Close quiz"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-muted rounded-full mb-6 overflow-hidden">
        <div
          className="h-1 bg-primary rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${((currentQuestion + (hasAnswered ? 1 : 0)) / quiz.questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Question */}
      <p className="text-base font-medium text-foreground mb-5 leading-relaxed">
        {question.question}
      </p>

      {/* Options */}
      <div className="space-y-3 mb-5">
        {question.options.map((option, idx) => {
          let cls =
            "w-full p-4 text-left rounded-xl border text-sm font-medium transition-all duration-200 ";

          if (!hasAnswered) {
            cls +=
              "border-border/50 hover:border-primary/50 hover:bg-primary/5 text-foreground cursor-pointer";
          } else if (idx === question.correctIndex) {
            cls +=
              "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300";
          } else if (idx === selectedAnswer) {
            cls +=
              "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300";
          } else {
            cls += "border-border/20 text-muted-foreground opacity-50 cursor-default";
          }

          return (
            <button key={idx} onClick={() => handleAnswer(idx)} className={cls}>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center text-xs font-bold font-mono">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1 text-left">{option}</span>
                {hasAnswered && idx === question.correctIndex && (
                  <Check className="w-4 h-4 flex-shrink-0 text-green-500" />
                )}
                {hasAnswered &&
                  idx === selectedAnswer &&
                  idx !== question.correctIndex && (
                    <X className="w-4 h-4 flex-shrink-0 text-red-500" />
                  )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Feedback + Next */}
      <AnimatePresence>
        {hasAnswered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`p-4 rounded-xl mb-4 text-sm border ${
                selectedAnswer === question.correctIndex
                  ? "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20"
                  : "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20"
              }`}
            >
              <p className="font-semibold mb-1">
                {selectedAnswer === question.correctIndex ? "✓ Correct!" : "✗ Not quite"}
              </p>
              <p className="opacity-80 leading-relaxed">{question.explanation}</p>
            </div>
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all"
            >
              {currentQuestion < quiz.questions.length - 1
                ? "Next Question"
                : "See Results"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ResultsView({
  score,
  total,
  topic,
  onReset,
  onClose,
}: {
  score: number;
  total: number;
  topic: string;
  onReset: () => void;
  onClose: () => void;
}) {
  const pct = Math.round((score / total) * 100);
  const emoji = pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "📚";
  const message =
    pct >= 80 ? "Excellent work!" : pct >= 60 ? "Good effort!" : "Keep learning!";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full glass-card rounded-xl p-8 border border-primary/20 text-center"
    >
      <div className="text-5xl mb-4">{emoji}</div>
      <h3 className="text-xl font-bold text-foreground mb-1">{message}</h3>
      <p className="text-sm text-muted-foreground mb-6">{topic}</p>

      <div className="bg-muted/30 rounded-xl p-5 mb-6 border border-border/50">
        <div className="text-4xl font-bold text-primary mb-1">
          {score} / {total}
        </div>
        <div className="text-sm text-muted-foreground">{pct}% correct</div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-xl text-foreground hover:bg-muted/50 transition-colors font-medium text-sm"
        >
          <RotateCcw className="w-4 h-4" /> Retake
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}
