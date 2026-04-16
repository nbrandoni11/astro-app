import React, { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';
import Link from 'next/link';
import styles from './Button.module.css';

interface BaseProps {
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

type ButtonAsButton = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };
type ButtonAsLink = BaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}: ButtonProps) {
  const rootClass = `${styles.button} ${styles[variant]} ${fullWidth ? styles.fullWidth : ''} ${className}`.trim();
  
  if (props.href) {
    const { href, ...restProps } = props as ButtonAsLink;
    return (
      <Link href={href} className={rootClass} {...restProps}>
        {children}
      </Link>
    );
  }

  return (
    <button className={rootClass} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
