"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { api, ApiError } from "@/lib/api";
import type { Quiz, QuizAttempt } from "@/lib/types";

type Answers = Record<number, number[]>;

export function QuizCard({ quiz: quizSummary }: { quiz: Quiz }) {
  const [open, setOpen] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizAttempt | null>(null);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && !quiz) {
      setLoadingQuiz(true);
      try {
        const data = await api.get<Quiz>(`/quizzes/${quizSummary.id}`);
        setQuiz(data);
      } catch {
        toast.error("Could not load this quiz.");
        setOpen(false);
      } finally {
        setLoadingQuiz(false);
      }
    }
  }

  function selectSingle(questionId: number, optionId: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: [optionId] }));
  }

  function toggleMultiple(questionId: number, optionId: number, checked: boolean) {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      const next = checked ? [...current, optionId] : current.filter((id) => id !== optionId);
      return { ...prev, [questionId]: next };
    });
  }

  async function handleSubmit() {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const attempt = await api.post<QuizAttempt>(`/quizzes/${quiz.id}/attempt`, { answers });
      setResult(attempt);
      toast.success(`Quiz submitted — score: ${Math.round(Number(attempt.score))}%`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not submit your quiz attempt.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetake() {
    setResult(null);
    setAnswers({});
  }

  const hasQuestions = (quiz?.questions?.length ?? 0) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{quizSummary.title}</CardTitle>
        {quizSummary.description && <CardDescription>{quizSummary.description}</CardDescription>}
      </CardHeader>
      <CardFooter>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button />}>Take quiz</DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{quizSummary.title}</DialogTitle>
              <DialogDescription>Answer every question, then submit to see your score.</DialogDescription>
            </DialogHeader>

            {loadingQuiz && <p className="text-sm text-muted-foreground">Loading quiz...</p>}

            {result ? (
              <div className="flex flex-col gap-3">
                <p className="text-lg font-semibold text-foreground">Score: {Math.round(Number(result.score))}%</p>
                <Button variant="outline" onClick={handleRetake} className="w-fit">
                  Retake quiz
                </Button>
              </div>
            ) : (
              quiz &&
              (hasQuestions ? (
                <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto">
                  {quiz.questions?.map((question) => (
                    <div key={question.id} className="flex flex-col gap-2">
                      <FieldLabel className="font-medium text-foreground">{question.body}</FieldLabel>
                      {question.type === "single" ? (
                        <RadioGroup
                          value={answers[question.id]?.[0]?.toString() ?? ""}
                          onValueChange={(value) => selectSingle(question.id, Number(value))}
                        >
                          {question.options?.map((option) => (
                            <FieldLabel key={option.id} className="flex items-center gap-2 font-normal">
                              <RadioGroupItem value={option.id.toString()} />
                              {option.body}
                            </FieldLabel>
                          ))}
                        </RadioGroup>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {question.options?.map((option) => (
                            <FieldLabel key={option.id} className="flex items-center gap-2 font-normal">
                              <Checkbox
                                checked={(answers[question.id] ?? []).includes(option.id)}
                                onCheckedChange={(checked) => toggleMultiple(question.id, option.id, checked)}
                              />
                              {option.body}
                            </FieldLabel>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">This quiz has no questions yet.</p>
              ))
            )}

            {!result && quiz && hasQuestions && (
              <DialogFooter>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit quiz"}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
