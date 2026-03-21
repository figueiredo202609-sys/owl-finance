export const DashboardBubble = ({ title, value, icon: Icon, colorClass, delay = 0 }) => (
  <div
    className={`bubble-float-${delay + 1} relative aspect-square rounded-full flex flex-col justify-center items-center
      bg-gradient-to-br ${colorClass}
      backdrop-blur-xl border border-white/20
      shadow-[0_8px_40px_rgba(30,58,138,0.5)]
      p-8 w-full max-w-[260px] mx-auto cursor-default
      hover:shadow-[0_12px_48px_rgba(124,58,237,0.6)] transition-shadow duration-300`}
  >
    <div className="absolute inset-0 rounded-full bg-white/5 pointer-events-none" />
    <Icon size={36} className="text-white/90 mb-3 relative z-10" />
    <p className="text-white/70 text-xs font-semibold tracking-widest uppercase relative z-10">{title}</p>
    <p className="text-white text-2xl font-bold mt-1.5 relative z-10 text-center leading-tight">{value}</p>
  </div>
);
