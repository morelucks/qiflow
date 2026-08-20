interface StepItemProps {
  stepNumber: string;
  title: string;
  description: string;
  isLast?: boolean;
}

export default function StepItem({ stepNumber, title, description, isLast = false }: StepItemProps) {
  return (
    <div className="relative flex items-start gap-6 sm:gap-10 group">
      {/* Connecting Vertical Line */}
      {!isLast && (
        <div className="absolute left-[35px] sm:left-[39px] top-[72px] bottom-[-24px] w-[2px] bg-gradient-to-b from-mint via-violet to-transparent opacity-30" />
      )}

      {/* Numbered Circle (72px, indigo bg, mint text, border) */}
      <div className="relative z-10 shrink-0 w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-indigo border-2 border-violet/40 flex items-center justify-center text-mint font-bold text-2xl shadow-card group-hover:scale-108 group-hover:border-mint group-hover:shadow-glow-mint transition-all duration-300">
        {stepNumber}
      </div>

      {/* Content */}
      <div className="pt-3 pb-8 text-left max-w-xl">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-mint transition-colors">
          {title}
        </h3>
        <p className="text-[#A5A3B8] font-light text-sm sm:text-base leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
