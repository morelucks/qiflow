import { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group relative rounded-2xl bg-gradient-to-b from-indigo/60 to-ink/40 border border-violet/20 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-violet/40 hover:shadow-card-lg overflow-hidden flex flex-col items-start text-left">
      {/* Top Accent Line (Appears on Hover) */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-mint via-violet to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Radial Mint Glow Behind on Hover */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-mint/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Icon Container (56px square, rounded-2xl, violet-soft bg, mint icon) */}
      <div className="w-14 h-14 rounded-2xl bg-violet-soft border border-violet/30 flex items-center justify-center text-mint mb-6 group-hover:scale-110 group-hover:border-mint/50 transition-all duration-300 shadow-sm">
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-white mb-3 tracking-tight group-hover:text-mint transition-colors">
        {title}
      </h3>

      {/* Description */}
      <p className="text-[#A5A3B8] font-light text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
