interface Mistake {
  questionId: string
  question_text: string
  yourAnswerText: string
  correctAnswerText: string
  submittedAt: string
}

export function MistakesRow({ mistakes }: { mistakes: Mistake[] }) {
  if (mistakes.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-micro uppercase tracking-[0.3em] text-whitex-faint">
          What you got wrong
        </h2>
        <div className="rounded-2xl border border-midnight-line bg-midnight-elevated/30 p-8 text-center text-caption text-whitex-muted backdrop-blur">
          🎯 Nothing to review — yet. Take your first quiz.
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-micro uppercase tracking-[0.3em] text-whitex-faint">
          What you got wrong ({mistakes.length})
        </h2>
      </div>

      <div className="-mx-5 overflow-x-auto px-5 pb-2">
        <ul className="flex gap-3">
          {mistakes.map(m => (
            <li
              key={m.questionId}
              className="w-[280px] shrink-0 rounded-2xl border border-midnight-line bg-midnight-elevated/40 p-4 backdrop-blur"
            >
              <p className="mb-3 line-clamp-3 text-body text-whitex-soft">{m.question_text}</p>
              <div className="space-y-1.5 text-caption">
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                  <span className="text-whitex-muted">
                    <span className="text-whitex-faint">You: </span>
                    <span className="line-through">{m.yourAnswerText}</span>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                  <span className="text-whitex-soft">
                    <span className="text-whitex-faint">Correct: </span>
                    {m.correctAnswerText}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
