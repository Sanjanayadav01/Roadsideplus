const STEPS = ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED'];
const LABEL = { REQUESTED: 'Requested', ACCEPTED: 'Accepted', EN_ROUTE: 'On the way',
  ARRIVED: 'Arrived', COMPLETED: 'Done' };

export default function StatusSteps({ status }) {
  if (status === 'CANCELLED') return <p className="cancelled">This request was cancelled.</p>;
  const at = STEPS.indexOf(status);
  return (
    <ol className="steps">
      {STEPS.map((s, i) => (
        <li key={s} className={i < at ? 'done' : i === at ? 'now' : ''}>{LABEL[s]}</li>
      ))}
    </ol>
  );
}
