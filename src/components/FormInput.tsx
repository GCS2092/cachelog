import { useState } from 'react';

interface FormInputProps {
  label: string;
  type?: 'text' | 'password' | 'number' | 'email';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  maxLength?: number;
  pattern?: RegExp;
  validationMessage?: string;
}

export default function FormInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  maxLength,
  pattern,
  validationMessage,
}: FormInputProps) {
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Validation en temps réel
    if (pattern && touched) {
      if (!pattern.test(newValue)) {
        setLocalError(validationMessage || 'Format invalide');
      } else {
        setLocalError('');
      }
    }
    
    onChange(newValue);
  };

  const handleBlur = () => {
    setTouched(true);
    
    // Validation à la perte de focus
    if (required && !value) {
      setLocalError(`${label} est requis`);
    } else if (pattern && value && !pattern.test(value)) {
      setLocalError(validationMessage || 'Format invalide');
    }
  };

  const displayError = error || localError;

  return (
    <div className="space-y-2">
      <label htmlFor={label} className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        id={label}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
        className={`w-full px-4 py-3 bg-gray-800 rounded-lg border transition-all duration-200 ${
          displayError
            ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
            : 'border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
        } focus:outline-none disabled:bg-gray-700 disabled:cursor-not-allowed`}
      />
      {displayError && (
        <p className="text-sm text-red-400">{displayError}</p>
      )}
    </div>
  );
}
