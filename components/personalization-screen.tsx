'use client'

const interestOptions = ['Technology', 'Data & Analytics', 'AI & Machine Learning', 'Business & Startups', 'Education & Learning', 'Finance', 'Shopping & Products', 'Health & Wellness', 'Environment', 'Design & Creativity', 'News & Research', 'Sports', 'Entertainment', 'Travel', 'Other']
const needOptions = ['Learning something', 'Research', 'College / Education', 'Work', 'Business', 'Personal use', 'Other']
const formatOptions = ['Quick answers', 'Detailed explanations', 'Data & statistics', 'Step-by-step information', 'Visual information', 'Sources & references']
const priorityOptions = ['Accuracy', 'Latest information', 'Reliable sources', 'Easy-to-understand results', 'Multiple sources', 'Fast results']

type Props = {
  onComplete?: () => void
  name: string
  step: number
  setStep: (step: number) => void
  interests: string[]
  setInterests: (values: string[]) => void
  informationNeeds: string[]
  setInformationNeeds: (values: string[]) => void
  interactionPreferences: string[]
  setInteractionPreferences: (values: string[]) => void
  formatPreferences: string[]
  setFormatPreferences: (values: string[]) => void
  priorityPreferences: string[]
  setPriorityPreferences: (values: string[]) => void
  toggleSelection: (value: string, setter: (values: string[]) => void, selected: string[]) => void
}

export function PersonalizationScreen({ onComplete, name, step, setStep, interests, setInterests, informationNeeds, setInformationNeeds, interactionPreferences, setInteractionPreferences, formatPreferences, setFormatPreferences, priorityPreferences, setPriorityPreferences, toggleSelection }: Props) {
  function finish() {
    setStep(5)
    window.setTimeout(() => onComplete?.(), 1400)
  }

  if (step === 5) return <section className="personalization personalization-done" aria-live="polite"><span className="done-check" aria-hidden="true">✓</span><h1>You&apos;re all set.</h1><p>Your FetchIT experience is ready to be personalized as you use it.</p></section>

  const options = step === 1 ? interestOptions : step === 2 ? needOptions : step === 3 ? formatOptions : priorityOptions
  const selected = step === 1 ? interests : step === 2 ? informationNeeds : step === 3 ? formatPreferences : priorityPreferences
  const setter = step === 1 ? setInterests : step === 2 ? setInformationNeeds : step === 3 ? setFormatPreferences : setPriorityPreferences
  const question = step === 1 ? 'What are your areas of interest?' : step === 2 ? 'What do you usually need information for?' : step === 3 ? 'What kind of information do you prefer?' : 'What matters most when you look for information?'

  return <section className="personalization" aria-labelledby="personalization-title">
    {step === 1 && <p className="personalization-welcome">Welcome, {name} <span aria-hidden="true">👋</span><br />Let&apos;s personalize FetchIT for you.</p>}
    <div className="personalization-heading">{step > 1 && <button type="button" className="question-back" onClick={() => setStep(step - 1)} aria-label="Go back to previous question">← Back</button>}<span className="step-count">{step} of 4</span>{step === 1 && <h1 id="personalization-title">Tell us a little about you</h1>}</div>
    <p className="question">{question}</p>
    <p className="select-hint">Select all that apply</p>
    <div className="option-grid">{options.map(option => <button type="button" key={option} className={`option-chip ${selected.includes(option) ? 'selected' : ''}`} onClick={() => toggleSelection(option, setter, selected)} aria-pressed={selected.includes(option)}>{option}</button>)}</div>
    <div className="personalization-actions"><button type="button" className="skip-link" onClick={() => step < 4 ? setStep(step + 1) : setStep(5)}>Skip for now <span aria-hidden="true">→</span></button><button type="button" className="auth-button" onClick={() => step < 4 ? setStep(step + 1) : finish()}>{step < 4 ? 'Next' : 'Finish'}</button></div>
    {step === 4 && <p className="personalization-complete" role="status">You&apos;re all set.</p>}
  </section>
}
