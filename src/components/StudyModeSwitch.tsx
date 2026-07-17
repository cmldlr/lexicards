import React from 'react';

interface StudyModeOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface StudyModeSwitchProps<T extends string> {
  value: T;
  options: [StudyModeOption<T>, StudyModeOption<T>];
  onChange: (value: T) => void;
}

export default function StudyModeSwitch<T extends string>({ value, options, onChange }: StudyModeSwitchProps<T>) {
  return (
    <div className="grid flex-1 grid-cols-2 gap-1 rounded-lg border border-slate-100 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-slate-950">
      {options.map(option => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-[11px] font-extrabold transition-all sm:text-xs ${isActive ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
