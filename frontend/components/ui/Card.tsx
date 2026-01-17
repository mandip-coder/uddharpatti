import { HTMLAttributes, FC } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card: FC<HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        "bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl border border-slate-700 shadow-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
