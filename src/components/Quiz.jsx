import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { SEASON } from '../data/drivers.js'
import { resolveVars, tOption } from '../i18n/data.js'
import { buildQuiz, MAX_QUESTIONS, TOPIC_IDS } from '../quiz/generate.js'

const LENGTHS = [5, 10, 22]

const VERDICTS = [
  { min: 100, id: 'winner' },
  { min: 80, id: 'podium' },
  { min: 60, id: 'points' },
  { min: 40, id: 'outside' },
  { min: 0, id: 'back' },
]

function Media({ media }) {
  const { t } = useTranslation()
  if (!media) return null
  if (media.kind === 'number') {
    return <div className="q-number">{media.value}</div>
  }
  return (
    <img
      className={`q-photo${media.blurred ? ' blurred' : ''}`}
      src={media.src}
      alt={t('quiz.mysteryDriver')}
    />
  )
}

function Setup({ onStart }) {
  const { t } = useTranslation()
  const [topic, setTopic] = useState('mixed')
  const [length, setLength] = useState(10)

  return (
    <div className="panel quiz-intro">
      <h2>{t('quiz.introTitle', { year: SEASON.year })}</h2>
      <p>{t('quiz.introBody')}</p>

      <div className="field">
        <span className="field-label">{t('quiz.topicLabel')}</span>
        <div className="chips">
          {TOPIC_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="chip"
              aria-pressed={topic === id}
              onClick={() => setTopic(id)}
            >
              {t(`quiz.topics.${id}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">{t('quiz.lengthLabel')}</span>
        <div className="chips">
          {LENGTHS.map((n) => (
            <button
              key={n}
              type="button"
              className="chip"
              aria-pressed={length === n}
              onClick={() => setLength(n)}
            >
              {n === MAX_QUESTIONS ? t('quiz.fullGrid', { count: n }) : n}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="btn" onClick={() => onStart(topic, length)}>
        {t('quiz.start')}
      </button>
    </div>
  )
}

/**
 * Questions that showed a photo or a number read as "this driver" / "this number",
 * which is meaningless once the media is gone. Those carry a `reviewKey` that
 * names the subject instead.
 */
const reviewPrompt = (t, q) => t(q.reviewKey ?? q.promptKey, resolveVars(t, q.promptVars))

function Results({ answers, questions, onRestart, onNewQuiz }) {
  const { t } = useTranslation()
  const score = answers.filter((a) => a.correct).length
  const pct = Math.round((score / questions.length) * 100)
  const verdict = VERDICTS.find((v) => pct >= v.min)

  return (
    <div className="panel">
      <div className="result-score">
        <div className="result-ring" style={{ '--pct': pct }}>
          <div>
            <div className="result-pct">{pct}%</div>
            <div className="result-frac">
              {score} / {questions.length}
            </div>
          </div>
        </div>
        <div className="result-title">{t(`quiz.verdicts.${verdict.id}.title`)}</div>
        <div className="result-blurb">{t(`quiz.verdicts.${verdict.id}.blurb`)}</div>
      </div>

      <div className="review">
        {questions.map((q, i) => (
          <div key={i} className="review-row">
            <span className="review-icon">{answers[i].correct ? '✅' : '❌'}</span>
            <span className="review-q">
              {reviewPrompt(t, q)} — <b>{tOption(t, q.correct, q.optionKind)}</b>
              {!answers[i].correct && (
                <>
                  {' · '}
                  {t('quiz.youSaid', { choice: tOption(t, answers[i].choice, q.optionKind) })}
                </>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="quiz-actions">
        <button type="button" className="btn" onClick={onRestart}>
          {t('quiz.actions.playAgain')}
        </button>
        <button type="button" className="btn secondary" onClick={onNewQuiz}>
          {t('quiz.actions.changeTopic')}
        </button>
      </div>
    </div>
  )
}

export default function Quiz() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState(null)
  const [questions, setQuestions] = useState(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [choice, setChoice] = useState(null)

  const start = (topic, length) => {
    setSettings({ topic, length })
    setQuestions(buildQuiz(topic, length))
    setIndex(0)
    setAnswers([])
    setChoice(null)
  }

  if (!questions) {
    return (
      <div className="quiz">
        <Setup onStart={start} />
      </div>
    )
  }

  if (index >= questions.length) {
    return (
      <div className="quiz">
        <Results
          questions={questions}
          answers={answers}
          onRestart={() => start(settings.topic, settings.length)}
          onNewQuiz={() => setQuestions(null)}
        />
      </div>
    )
  }

  const q = questions[index]
  const answered = choice !== null

  const answer = (option) => {
    if (answered) return
    setChoice(option)
    setAnswers([...answers, { choice: option, correct: option === q.correct }])
  }

  const next = () => {
    setChoice(null)
    setIndex(index + 1)
  }

  return (
    <div className="quiz">
      <div className="quiz-head">
        <span>
          <Trans
            i18nKey="quiz.progress"
            values={{ current: index + 1, total: questions.length }}
            components={{ b: <b /> }}
          />
        </span>
        <span>
          <Trans
            i18nKey="quiz.score"
            values={{ score: answers.filter((a) => a.correct).length }}
            components={{ b: <b /> }}
          />
        </span>
      </div>
      <div className="progress">
        <span style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>

      <div className="panel">
        <Media media={q.media} />
        <p className="question">{t(q.promptKey, resolveVars(t, q.promptVars))}</p>

        <div className="options">
          {q.options.map((option) => {
            const isCorrect = option === q.correct
            const isChoice = option === choice
            let cls = 'option'
            if (answered && isCorrect) cls += ' correct'
            else if (answered && isChoice) cls += ' wrong'
            else if (answered) cls += ' faded'
            return (
              <button
                key={option}
                type="button"
                className={cls}
                disabled={answered}
                onClick={() => answer(option)}
              >
                {tOption(t, option, q.optionKind)}
                {answered && isCorrect && <span className="option-mark">✅</span>}
                {answered && isChoice && !isCorrect && <span className="option-mark">❌</span>}
              </button>
            )
          })}
        </div>

        {answered && (
          <>
            <div className="feedback">
              <img src={q.subject.photo} alt="" />
              <span>
                <b>{choice === q.correct ? t('quiz.feedback.correct') : t('quiz.feedback.wrong')}</b>{' '}
                {t(q.explainKey, resolveVars(t, q.explainVars))}
              </span>
            </div>
            <div className="quiz-actions">
              <button type="button" className="btn" onClick={next}>
                {index + 1 === questions.length
                  ? t('quiz.actions.seeResults')
                  : t('quiz.actions.nextQuestion')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
