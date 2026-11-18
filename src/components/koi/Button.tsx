import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import { cx } from "./cx";

import {
  buttonClass,
  type ButtonSize,
  type ButtonVariant,
} from "./buttonClass";

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  trailing?: ReactNode;
}

type ButtonAsButton = ButtonOwnProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
    ref?: Ref<HTMLButtonElement>;
  };
type ButtonAsLink = ButtonOwnProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const {
    variant = "outline",
    size = "md",
    icon,
    trailing,
    className,
    children,
    ...rest
  } = props;
  const classes = buttonClass(variant, size, className);
  const content = (
    <>
      {icon && <span className="koi-btn__icon">{icon}</span>}
      <span className="koi-btn__label">{children}</span>
      {trailing && (
        <span className="koi-btn__icon koi-btn__icon--trail">{trailing}</span>
      )}
    </>
  );
  if (rest.href !== undefined) {
    return (
      <a
        className={classes}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={classes}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement> & {
        ref?: Ref<HTMLButtonElement>;
      })}
    >
      {content}
    </button>
  );
}

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label"
> {
  label: string;
  pressed?: boolean;
}

export function IconButton({
  label,
  pressed,
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={cx("koi-iconbtn", className)}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      {...rest}
    >
      {children}
    </button>
  );
}
