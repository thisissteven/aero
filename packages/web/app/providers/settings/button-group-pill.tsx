import { createContext, ReactNode, useContext } from 'react';

import { Button, ButtonGroup, ButtonProps, cn } from '@aero/ui';

interface ButtonGroupPillContextValue<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
}

const ButtonGroupPillContext =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createContext<ButtonGroupPillContextValue<any> | null>(null);

function useButtonGroupPillContext<T extends string>() {
  const ctx = useContext(ButtonGroupPillContext);
  if (!ctx) {
    throw new Error(
      'ButtonGroupPill.Button must be used within ButtonGroupPill',
    );
  }
  return ctx as ButtonGroupPillContextValue<T>;
}

interface ButtonGroupPillProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
  size?: ButtonProps['size'];
  children: ReactNode;
}

function ButtonGroupPillRoot<T extends string>({
  value,
  onValueChange,
  className,
  size = 'sm',
  children,
}: ButtonGroupPillProps<T>) {
  return (
    <ButtonGroupPillContext.Provider value={{ value, onValueChange }}>
      <ButtonGroup
        size={size}
        variant='outline'
        className={cn('w-full', className)}
      >
        {children}
      </ButtonGroup>
    </ButtonGroupPillContext.Provider>
  );
}

interface ButtonGroupPillButtonProps<T extends string> extends Omit<
  ButtonProps,
  'variant' | 'onPress'
> {
  value: T;
  children: ReactNode;
}

function ButtonGroupPillButton<T extends string>({
  value,
  className,
  children,
  ...props
}: ButtonGroupPillButtonProps<T>) {
  const { value: activeValue, onValueChange } = useButtonGroupPillContext<T>();
  const isActive = activeValue === value;

  return (
    <Button
      variant={isActive ? 'secondary' : 'outline'}
      onPress={() => onValueChange(value)}
      className={cn(
        'border-separator border transition-none',
        isActive
          ? 'hover:bg-default border-transparent'
          : 'hover:bg-transparent',
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export const ButtonGroupPill = Object.assign(ButtonGroupPillRoot, {
  Button: ButtonGroupPillButton,
});
