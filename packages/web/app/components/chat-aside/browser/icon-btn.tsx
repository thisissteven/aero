export function IconBtn({
  children,
  onClick,
  disabled,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition disabled:opacity-30 ${
        active ? 'bg-default text-accent-soft-foreground' : 'hover:bg-default'
      }`}
    >
      {children}
    </button>
  );
}
