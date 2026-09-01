import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useParams } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

import {
  Button,
  CheckboxButtonGroup,
  Disclosure,
  Input,
  toast,
} from '@aero/ui';

import { useChatStore } from '@/app/components/message-view/unused/streaming-demo/streaming-demo-store';
import type { QuestionOption } from '@/app/components/tool-call-view/tools/tool-types';
import {
  useRejectQuestion,
  useReplyToQuestion,
  useSessionQuestions,
} from '@/app/hooks/api/sessions';

export function ReplyToQuestion() {
  const { sessionId: activeSessionId } = useParams({
    strict: false,
  });

  const isAwaitingQuestion = useChatStore(activeSessionId, (state) => {
    if (!activeSessionId) {
      return false;
    }

    return state.hasAwaitingQuestion;
  });

  const {
    data: sessionQuestions = [],
    isLoading: isQuestionsLoading,
    refetch: refetchQuestions,
  } = useSessionQuestions(undefined, activeSessionId);

  const { mutateAsync: reply, isPending: isPendingReply } =
    useReplyToQuestion(undefined);

  const { mutateAsync: reject, isPending: isPendingReject } =
    useRejectQuestion(undefined);

  useEffect(() => {
    if (!activeSessionId || !isAwaitingQuestion) {
      return;
    }

    void refetchQuestions();
  }, [activeSessionId, isAwaitingQuestion, refetchQuestions]);

  const questionRequest = useMemo(() => {
    return (
      sessionQuestions.find(
        (question) => question.sessionID === activeSessionId,
      ) ?? null
    );
  }, [activeSessionId, sessionQuestions]);

  const questions = questionRequest?.questions ?? [];

  const [answers, setAnswers] = useState<string[][]>([]);
  const [customAnswers, setCustomAnswers] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    if (!questionRequest) {
      return;
    }

    setAnswers((current) => questions.map((_, index) => current[index] ?? []));

    setCustomAnswers((current) =>
      questions.map((_, index) => current[index] ?? ''),
    );

    setCurrentQuestionIndex((current) =>
      Math.min(Math.max(current, 0), Math.max(questions.length - 1, 0)),
    );
  }, [questionRequest?.id]);

  useEffect(() => {
    if (isAwaitingQuestion) {
      return;
    }

    setAnswers([]);
    setCustomAnswers([]);
    setCurrentQuestionIndex(0);
    setIsExpanded(true);
  }, [isAwaitingQuestion]);

  const isSubmitting = isPendingReply || isPendingReject;

  const normalizedAnswers = useMemo(
    () =>
      questions.map((_, index) => {
        const selected = answers[index] ?? [];
        const customAnswer = customAnswers[index]?.trim() ?? '';

        if (!customAnswer) {
          return selected;
        }

        const isMultiple = Boolean(
          (questions[index] as { multiple?: boolean }).multiple,
        );

        if (isMultiple) {
          return selected.includes(customAnswer)
            ? selected
            : [...selected, customAnswer];
        }

        return [customAnswer];
      }),
    [answers, customAnswers, questions],
  );

  const answeredCount = normalizedAnswers.filter(
    (answer) => answer.length > 0,
  ).length;

  const allAnswered =
    questions.length > 0 && answeredCount === questions.length;

  const currentQuestion = questions[currentQuestionIndex];

  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const currentAnswered =
    (normalizedAnswers[currentQuestionIndex]?.length ?? 0) > 0;

  if (
    !isAwaitingQuestion ||
    !questionRequest ||
    isQuestionsLoading ||
    questions.length === 0 ||
    !currentQuestion
  ) {
    return null;
  }

  const handleAnswerChange = (values: string[]) => {
    if (isSubmitting) {
      return;
    }

    setAnswers((current) => {
      const next = current.map((answer) => [...answer]);
      next[currentQuestionIndex] = values;
      return next;
    });

    if (values.length > 0) {
      setCustomAnswers((current) => {
        const next = [...current];
        next[currentQuestionIndex] = '';
        return next;
      });
    }
  };

  const handleCustomAnswerChange = (value: string) => {
    if (isSubmitting) {
      return;
    }

    setCustomAnswers((current) => {
      const next = [...current];
      next[currentQuestionIndex] = value;
      return next;
    });

    if (value.trim()) {
      const isMultiple = Boolean(
        (currentQuestion as { multiple?: boolean }).multiple,
      );

      if (!isMultiple) {
        setAnswers((current) => {
          const next = current.map((answer) => [...answer]);
          next[currentQuestionIndex] = [];
          return next;
        });
      }
    }
  };

  const handlePrevious = () => {
    if (isSubmitting || isFirstQuestion) {
      return;
    }

    setCurrentQuestionIndex((current) => current - 1);
  };

  const handleNext = () => {
    if (isSubmitting || isLastQuestion || !currentAnswered) {
      return;
    }

    setCurrentQuestionIndex((current) => current + 1);
  };

  const handleSubmit = () => {
    if (!allAnswered || isSubmitting) {
      return;
    }

    toast.promise(
      reply({
        sessionId: questionRequest.sessionID,
        requestId: questionRequest.id,
        answers: normalizedAnswers,
      }),
      {
        error: (err) => err.message,
        loading: 'Submitting answers...',
        success: 'Answers submitted',
      },
    );
  };

  const handleReject = () => {
    if (isSubmitting) {
      return;
    }

    toast.promise(
      reject({
        sessionId: questionRequest.sessionID,
        requestId: questionRequest.id,
      }),
      {
        error: (err) => err.message,
        loading: 'Rejecting question...',
        success: 'Question rejected',
      },
    );
  };

  const isMultiple = Boolean(
    (currentQuestion as { multiple?: boolean }).multiple,
  );

  const options = (currentQuestion.options ?? []) as QuestionOption[];

  const currentCustomAnswer = customAnswers[currentQuestionIndex] ?? '';

  return (
    <div className='@container pb-2'>
      <Disclosure
        isExpanded={isExpanded}
        onExpandedChange={setIsExpanded}
        className='border-separator bg-surface text-surface-foreground w-full overflow-hidden rounded-xl border'
      >
        <Disclosure.Heading>
          <Disclosure.Trigger className='group hover:bg-default w-full px-3 py-2.5 text-sm transition-colors'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex min-w-0 items-center gap-2.5'>
                <div
                  className={[
                    'flex size-7 shrink-0 items-center justify-center rounded-lg',
                    allAnswered
                      ? 'bg-success-soft text-success'
                      : 'bg-accent-soft text-accent',
                  ].join(' ')}
                >
                  {allAnswered ? (
                    <CircleCheck className='size-4' />
                  ) : (
                    <span className='text-xs font-semibold'>?</span>
                  )}
                </div>

                <div className='min-w-0 text-left'>
                  <div className='truncate font-medium'>
                    Agent question{questions.length > 1 ? 's' : ''}
                  </div>

                  <div className='text-muted truncate text-[11px]'>
                    {allAnswered
                      ? 'All questions answered'
                      : `${answeredCount}/${questions.length} answered`}
                  </div>
                </div>
              </div>

              <Icon
                data={ChevronDown}
                className={[
                  'text-foreground/50 shrink-0 transition-transform',
                  'group-hover:text-foreground',
                  isExpanded && 'rotate-180',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            </div>
          </Disclosure.Trigger>
        </Disclosure.Heading>

        <Disclosure.Content>
          <div className='border-separator border-t'>
            <div className='space-y-3 p-2 pb-3'>
              <div className='flex items-center justify-between px-2 pt-1'>
                <div className='min-w-0'>
                  {currentQuestion.header && (
                    <div className='text-muted mb-0.5 text-[11px] font-medium tracking-wider uppercase'>
                      {currentQuestion.header}
                    </div>
                  )}

                  <div className='text-foreground text-sm leading-5 font-medium'>
                    {currentQuestion.question}
                  </div>
                </div>

                <span className='text-muted shrink-0 text-[11px] tabular-nums'>
                  {currentQuestionIndex + 1}/{questions.length}
                </span>
              </div>

              {isMultiple && (
                <div className='text-muted px-2 text-[11px]'>
                  Select one or more options.
                </div>
              )}

              <div className='max-h-[min(200px,40vh)] scrollbar-thin overflow-y-auto'>
                <CheckboxButtonGroup
                  layout='grid'
                  value={answers[currentQuestionIndex] ?? []}
                  onChange={(values) =>
                    handleAnswerChange(Array.from(values).map(String))
                  }
                  isDisabled={isSubmitting}
                  className='grid grid-cols-1 gap-2 px-2 py-1 @sm:grid-cols-2'
                >
                  {options.map((option) => (
                    <CheckboxButtonGroup.Item
                      key={option.label}
                      value={option.label}
                      className='min-h-0'
                      variant='secondary'
                    >
                      <CheckboxButtonGroup.ItemContent>
                        <div className='min-w-0'>
                          <div className='text-foreground text-sm leading-4 font-medium'>
                            {option.label}
                          </div>

                          {option.description && (
                            <div className='text-muted mt-1 line-clamp-2 text-[11px] leading-4'>
                              {option.description}
                            </div>
                          )}
                        </div>
                      </CheckboxButtonGroup.ItemContent>

                      <CheckboxButtonGroup.Indicator />
                    </CheckboxButtonGroup.Item>
                  ))}
                </CheckboxButtonGroup>
              </div>

              <div className='px-3'>
                <Input
                  variant='secondary'
                  className='w-full'
                  value={currentCustomAnswer}
                  onChange={(event) =>
                    handleCustomAnswerChange(event.target.value)
                  }
                  disabled={isSubmitting}
                  placeholder='Or type your own answer'
                />
              </div>

              <div className='flex items-center justify-between gap-2 px-2 pt-1'>
                <Button
                  variant='danger-soft'
                  size='sm'
                  isDisabled={isSubmitting}
                  onPress={handleReject}
                >
                  Reject
                </Button>

                <div className='flex items-center gap-1'>
                  <Button
                    variant='ghost'
                    size='sm'
                    isIconOnly
                    aria-label='Previous question'
                    isDisabled={isFirstQuestion || isSubmitting}
                    onPress={handlePrevious}
                  >
                    <Icon data={ChevronLeft} />
                  </Button>

                  {!isLastQuestion ? (
                    <Button
                      size='sm'
                      isDisabled={!currentAnswered || isSubmitting}
                      onPress={handleNext}
                    >
                      Next
                      <Icon data={ChevronRight} />
                    </Button>
                  ) : (
                    <Button
                      size='sm'
                      isDisabled={!allAnswered || isSubmitting}
                      onPress={handleSubmit}
                    >
                      {isPendingReply ? 'Submitting…' : 'Continue'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Disclosure.Content>
      </Disclosure>
    </div>
  );
}
