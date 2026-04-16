import React, { InputHTMLAttributes, forwardRef } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const generatedId = id || `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
    
    return (
      <div className={`${styles.container} ${className}`}>
        <label htmlFor={generatedId} className={styles.label}>
          {label}
        </label>
        <input
          id={generatedId}
          ref={ref}
          className={`${styles.input} ${error ? styles.errorInput : ''}`}
          {...props}
        />
        {error && <span className={styles.errorMessage}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
