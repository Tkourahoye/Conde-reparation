import React from "react";
import { motion as Motion } from "motion/react";

export const Button = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
  disabled?: boolean;
  className?: string;
}) => {
  const baseStyles = "w-full py-4 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer select-none";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 active:scale-95",
    secondary: "bg-gray-800 hover:bg-gray-700 text-white active:scale-95",
    outline: "border-2 border-blue-600/30 hover:border-blue-500 text-blue-400 active:scale-95",
  };

  return (
    <Motion.button
      whileHover={disabled ? {} : { y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {children}
    </Motion.button>
  );
};

export const Input = ({ label, placeholder, value, onChange, type = "text", ...rest }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
      {...rest}
    />
  </div>
);

export const Select = ({ label, value, onChange, options }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
    <select
      value={value}
      onChange={onChange}
      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm appearance-none cursor-pointer"
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);
