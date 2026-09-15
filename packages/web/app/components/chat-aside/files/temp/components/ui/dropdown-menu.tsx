export const DropdownMenu = ({ children }: any) => <div>{children}</div>;
export const DropdownMenuTrigger = ({ children }: any) => (
  <span>{children}</span>
);
export const DropdownMenuContent = ({ children }: any) => (
  <div style={{ position: 'absolute', zIndex: 50 }}>{children}</div>
);
export const DropdownMenuItem = ({ children, onClick }: any) => (
  <button onClick={onClick}>{children}</button>
);
export const DropdownMenuSeparator = () => <hr />;
