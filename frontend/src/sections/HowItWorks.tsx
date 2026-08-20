import StepItem from '../components/StepItem';

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Generate API Keys & Account',
      description: 'Sign up for a merchant account in seconds. Access your API keys and configure your settlement Quai wallet address.',
    },
    {
      number: '02',
      title: 'Create Payment Request or Share Link',
      description: 'Issue one-time checkout links via the dashboard or call POST /v1/payments programmatically from your application server.',
    },
    {
      number: '03',
      title: 'Instant Settlement & HMAC Notification',
      description: 'Your customer pays with Qi on Quai Network. Your server receives an HMAC-signed webhook and funds deposit instantly.',
    },
  ];

  return (
    <section id="how-it-works" className="relative py-28 px-6 bg-indigo/20 border-y border-violet/10 overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-violet/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
          <h2 className="text-xs font-semibold text-mint uppercase tracking-widest">
            Seamless Workflow
          </h2>
          <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            How QiFlow Works
          </p>
          <p className="text-[#A5A3B8] font-light text-base sm:text-lg">
            Start accepting Qi payments in three simple steps with zero friction.
          </p>
        </div>

        {/* Vertical Timeline */}
        <div className="max-w-3xl mx-auto pl-2 sm:pl-8">
          {steps.map((step, idx) => (
            <StepItem
              key={step.number}
              stepNumber={step.number}
              title={step.title}
              description={step.description}
              isLast={idx === steps.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
