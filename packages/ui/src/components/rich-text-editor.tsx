'use client';

import {
  Button,
  cn,
  Input,
  ListBox,
  Popover,
  Separator,
  ToggleButton,
  Toolbar,
  Tooltip,
} from '@heroui/react';
import type {
  Editor,
  EditorOptions,
  Extensions,
  JSONContent,
} from '@tiptap/core';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Underline } from '@tiptap/extension-underline';
import { PluginKey } from '@tiptap/pm/state';
import {
  EditorContent,
  EditorContext,
  useEditor,
  useEditorState,
} from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import { StarterKit } from '@tiptap/starter-kit';
import type { SuggestionProps } from '@tiptap/suggestion';
import { Suggestion } from '@tiptap/suggestion';
import type {
  ComponentProps,
  ComponentPropsWithRef,
  CSSProperties,
  ReactElement,
  ReactNode,
} from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

export type RichTextEditorCommand =
  | 'blockquote'
  | 'bold'
  | 'bulletList'
  | 'code'
  | 'codeBlock'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'italic'
  | 'orderedList'
  | 'strike'
  | 'underline';
export type RichTextEditorAction =
  'clearContent' | 'clearFormatting' | 'redo' | 'undo';

export interface RichTextEditorValueChangeDetails {
  characterCount: number;
  html: string;
  isEmpty: boolean;
  text: string;
  wordCount: number;
}

export interface RichTextEditorContextValue {
  editor: Editor | null;
  isDisabled: boolean;
  isReadOnly: boolean;
  maxLength?: number;
}
const RichTextEditorContext = createContext<RichTextEditorContextValue>({
  editor: null,
  isDisabled: false,
  isReadOnly: false,
});
export function useRichTextEditor(): RichTextEditorContextValue {
  return useContext(RichTextEditorContext);
}
export function useRichTextEditorState<T>(
  selector: (state: { editor: Editor }) => T,
  equalityFn?: (previous: T | null, next: T | null) => boolean,
): T | null {
  const { editor } = useRichTextEditor();
  return useEditorState({
    editor,
    ...(equalityFn === undefined ? {} : { equalityFn }),
    selector: ({ editor: current }) =>
      current ? selector({ editor: current }) : null,
  });
}

const emptyDocument: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};
const defaultSuggestionPrefixes = [' '];

function details(editor: Editor): RichTextEditorValueChangeDetails {
  return {
    characterCount:
      editor.storage.characterCount?.characters() ?? editor.getText().length,
    html: editor.getHTML(),
    isEmpty: editor.isEmpty,
    text: editor.getText(),
    wordCount:
      editor.storage.characterCount?.words() ??
      editor.getText().trim().split(/\s+/).filter(Boolean).length,
  };
}

export interface RichTextEditorRootProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange'
> {
  defaultValue?: JSONContent;
  editorOptions?: Partial<EditorOptions>;
  extensions?: Extensions;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  maxLength?: number;
  onValueChange?: (
    value: JSONContent,
    details: RichTextEditorValueChangeDetails,
  ) => void;
  placeholder?: string;
  value?: JSONContent;
}

function RichTextEditorRoot({
  children,
  className,
  defaultValue,
  editorOptions,
  extensions,
  isDisabled = false,
  isReadOnly = false,
  maxLength,
  onValueChange,
  placeholder = 'Start writing...',
  value,
  ...props
}: RichTextEditorRootProps): ReactElement {
  const initial = useRef(value ?? defaultValue ?? emptyDocument);
  const callbacks = useRef({
    onValueChange,
    onUpdate: editorOptions?.onUpdate,
  });
  callbacks.current = { onValueChange, onUpdate: editorOptions?.onUpdate };
  const editorExtensions = useMemo(
    () => [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
      CharacterCount.configure({ limit: maxLength }),
      ...(extensions ?? []),
    ],
    [extensions, maxLength, placeholder],
  );
  const editorAttributes = useMemo(() => {
    const attributes = editorOptions?.editorProps?.attributes;
    const decorate = (
      current: Record<string, string> = {},
    ): Record<string, string> => ({
      ...current,
      class:
        cn('rich-text-editor__prosemirror', current['class']) ??
        'rich-text-editor__prosemirror',
      'data-slot': 'rich-text-editor-prosemirror',
    });
    return typeof attributes === 'function'
      ? (...args: Parameters<typeof attributes>) =>
          decorate(attributes(...args))
      : decorate(attributes);
  }, [editorOptions?.editorProps?.attributes]);
  const editor = useEditor(
    {
      ...editorOptions,
      content: initial.current,
      editable: !isDisabled && !isReadOnly,
      editorProps: {
        ...editorOptions?.editorProps,
        attributes: editorAttributes,
      },
      extensions: editorExtensions,
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      onUpdate: (event) => {
        callbacks.current.onUpdate?.(event);
        callbacks.current.onValueChange?.(
          event.editor.getJSON(),
          details(event.editor),
        );
      },
    },
    [editorExtensions],
  );
  useEffect(() => {
    editor?.setEditable(!isDisabled && !isReadOnly);
  }, [editor, isDisabled, isReadOnly]);
  useEffect(() => {
    editor?.setOptions({
      editorProps: {
        ...editorOptions?.editorProps,
        attributes: editorAttributes,
      },
    });
  }, [editor, editorAttributes, editorOptions?.editorProps]);
  useEffect(() => {
    if (!editor || value === undefined) return;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(value))
      editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);
  const context = useMemo(
    () => ({
      editor,
      isDisabled,
      isReadOnly,
      ...(maxLength === undefined ? {} : { maxLength }),
    }),
    [editor, isDisabled, isReadOnly, maxLength],
  );
  const body = editor ? (
    <EditorContext value={{ editor }}>{children}</EditorContext>
  ) : (
    children
  );
  return (
    <RichTextEditorContext value={context}>
      <div
        {...props}
        className={cn('rich-text-editor', className)}
        data-disabled={isDisabled || undefined}
        data-readonly={isReadOnly || undefined}
        data-slot='rich-text-editor'
      >
        {body}
      </div>
    </RichTextEditorContext>
  );
}

function slotDiv(slot: string) {
  return function Slot({
    children,
    className,
    ...props
  }: ComponentPropsWithRef<'div'>): ReactElement {
    return (
      <div
        {...props}
        className={cn(slot, className)}
        data-slot={slot.replaceAll('__', '-')}
      >
        {children}
      </div>
    );
  };
}
const RichTextEditorShell: ReturnType<typeof slotDiv> = slotDiv(
  'rich-text-editor__shell',
);
function RichTextEditorToolbarGroup({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  return (
    <div
      {...props}
      className={cn('rich-text-editor__toolbar-group', className)}
      data-slot='rich-text-editor-toolbar-group'
      role='group'
    >
      {children}
    </div>
  );
}
const RichTextEditorFooter: ReturnType<typeof slotDiv> = slotDiv(
  'rich-text-editor__footer',
);

export type RichTextEditorToolbarProps = ComponentProps<typeof Toolbar>;
function RichTextEditorToolbar({
  'aria-label': ariaLabel = 'Editor toolbar',
  children,
  className,
  orientation = 'horizontal',
  ...props
}: RichTextEditorToolbarProps): ReactElement {
  return (
    <Toolbar
      {...props}
      aria-label={ariaLabel}
      className={(state) =>
        cn(
          'rich-text-editor__toolbar',
          typeof className === 'function' ? className(state) : className,
        ) ?? 'rich-text-editor__toolbar'
      }
      data-slot='rich-text-editor-toolbar'
      orientation={orientation}
    >
      {children}
    </Toolbar>
  );
}
function RichTextEditorToolbarSeparator({
  className,
  ...props
}: ComponentProps<typeof Separator>): ReactElement {
  return (
    <Separator
      {...props}
      className={
        cn('rich-text-editor__toolbar-separator', className) ??
        'rich-text-editor__toolbar-separator'
      }
      data-slot='rich-text-editor-toolbar-separator'
      orientation='vertical'
    />
  );
}

function active(editor: Editor, command: RichTextEditorCommand): boolean {
  if (command.startsWith('heading-'))
    return editor.isActive('heading', { level: Number(command.at(-1)) });
  return editor.isActive(
    command === 'bulletList'
      ? 'bulletList'
      : command === 'orderedList'
        ? 'orderedList'
        : command === 'codeBlock'
          ? 'codeBlock'
          : command,
  );
}
function run(editor: Editor, command: RichTextEditorCommand): boolean {
  const chain = editor.chain().focus();
  switch (command) {
    case 'bold':
      return chain.toggleBold().run();
    case 'italic':
      return chain.toggleItalic().run();
    case 'underline':
      return chain.toggleUnderline().run();
    case 'strike':
      return chain.toggleStrike().run();
    case 'code':
      return chain.toggleCode().run();
    case 'blockquote':
      return chain.toggleBlockquote().run();
    case 'bulletList':
      return chain.toggleBulletList().run();
    case 'orderedList':
      return chain.toggleOrderedList().run();
    case 'codeBlock':
      return chain.toggleCodeBlock().run();
    case 'heading-1':
      return chain.toggleHeading({ level: 1 }).run();
    case 'heading-2':
      return chain.toggleHeading({ level: 2 }).run();
    case 'heading-3':
      return chain.toggleHeading({ level: 3 }).run();
  }
}

function canRun(editor: Editor, command: RichTextEditorCommand): boolean {
  const chain = editor.can().chain().focus();
  switch (command) {
    case 'bold':
      return chain.toggleBold().run();
    case 'italic':
      return chain.toggleItalic().run();
    case 'underline':
      return chain.toggleUnderline().run();
    case 'strike':
      return chain.toggleStrike().run();
    case 'code':
      return chain.toggleCode().run();
    case 'blockquote':
      return chain.toggleBlockquote().run();
    case 'bulletList':
      return chain.toggleBulletList().run();
    case 'orderedList':
      return chain.toggleOrderedList().run();
    case 'codeBlock':
      return chain.toggleCodeBlock().run();
    case 'heading-1':
      return chain.toggleHeading({ level: 1 }).run();
    case 'heading-2':
      return chain.toggleHeading({ level: 2 }).run();
    case 'heading-3':
      return chain.toggleHeading({ level: 3 }).run();
  }
}
function canInvokeAction(
  editor: Editor,
  action: RichTextEditorAction,
): boolean {
  if (action === 'clearContent' || action === 'clearFormatting')
    return !editor.isEmpty;
  return editor.can().chain().focus()[action]().run();
}
const commandLabels: Record<RichTextEditorCommand, string> = {
  blockquote: 'Blockquote',
  bold: 'Bold',
  bulletList: 'Bulleted list',
  code: 'Inline code',
  codeBlock: 'Code block',
  'heading-1': 'Heading 1',
  'heading-2': 'Heading 2',
  'heading-3': 'Heading 3',
  italic: 'Italic',
  orderedList: 'Numbered list',
  strike: 'Strikethrough',
  underline: 'Underline',
};
const withEditorTooltip = (
  trigger: ReactElement,
  tooltip: ReactNode | undefined,
): ReactElement =>
  tooltip ? (
    <Tooltip delay={0}>
      <Tooltip.Trigger>{trigger}</Tooltip.Trigger>
      <Tooltip.Content>{tooltip}</Tooltip.Content>
    </Tooltip>
  ) : (
    trigger
  );

export interface RichTextEditorToggleButtonProps extends Omit<
  ComponentProps<typeof ToggleButton>,
  'isSelected'
> {
  command: RichTextEditorCommand;
  tooltip?: ReactNode;
}
function RichTextEditorToggleButton({
  'aria-label': ariaLabel,
  children,
  className,
  command,
  isDisabled,
  tooltip,
  ...props
}: RichTextEditorToggleButtonProps): ReactElement {
  const { editor, isDisabled: rootDisabled, isReadOnly } = useRichTextEditor();
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      active: current ? active(current, command) : false,
      canRun: current ? canRun(current, command) : false,
    }),
  });
  const disabled =
    rootDisabled || isReadOnly || isDisabled || !editor || !state?.canRun;
  return withEditorTooltip(
    <ToggleButton
      {...props}
      aria-label={
        ariaLabel ??
        (typeof tooltip === 'string' ? tooltip : commandLabels[command])
      }
      className={(renderProps) =>
        cn(
          'rich-text-editor__toolbar-button',
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? 'rich-text-editor__toolbar-button'
      }
      data-active={state?.active || undefined}
      data-command={command}
      data-slot='rich-text-editor-toggle-button'
      isDisabled={disabled}
      isIconOnly={props.isIconOnly ?? true}
      isSelected={state?.active ?? false}
      size={props.size ?? 'sm'}
      variant={props.variant ?? 'ghost'}
      onPress={(event) => {
        if (editor && !disabled) run(editor, command);
        props.onPress?.(event);
      }}
    >
      {children ?? commandLabels[command]}
    </ToggleButton>,
    tooltip,
  );
}

export interface RichTextEditorActionButtonProps extends ComponentProps<
  typeof Button
> {
  action: RichTextEditorAction;
  tooltip?: ReactNode;
}
function RichTextEditorActionButton({
  action,
  'aria-label': ariaLabel,
  children,
  className,
  isDisabled,
  tooltip,
  ...props
}: RichTextEditorActionButtonProps): ReactElement {
  const { editor, isDisabled: rootDisabled, isReadOnly } = useRichTextEditor();
  const canInvoke = useEditorState({
    editor,
    selector: ({ editor: current }): boolean => {
      if (!current || current.isDestroyed) return false;
      try {
        return canInvokeAction(current, action);
      } catch {
        return false;
      }
    },
  });
  const disabled =
    rootDisabled || isReadOnly || isDisabled || !editor || !canInvoke;
  const invoke = () => {
    if (!editor || disabled) return;
    const chain = editor.chain().focus();
    if (action === 'undo') chain.undo().run();
    else if (action === 'redo') chain.redo().run();
    else if (action === 'clearContent') chain.clearContent().run();
    else chain.unsetAllMarks().clearNodes().run();
  };
  return withEditorTooltip(
    <Button
      {...props}
      aria-label={
        ariaLabel ??
        (typeof tooltip === 'string'
          ? tooltip
          : {
              clearContent: 'Clear content',
              clearFormatting: 'Clear formatting',
              redo: 'Redo',
              undo: 'Undo',
            }[action])
      }
      className={(state) =>
        cn(
          'rich-text-editor__toolbar-button',
          typeof className === 'function' ? className(state) : className,
        ) ?? 'rich-text-editor__toolbar-button'
      }
      data-action={action}
      data-slot='rich-text-editor-action-button'
      isDisabled={disabled}
      isIconOnly={props.isIconOnly ?? true}
      size={props.size ?? 'sm'}
      variant={props.variant ?? 'tertiary'}
      onPress={(event) => {
        invoke();
        props.onPress?.(event);
      }}
    >
      {children ?? action}
    </Button>,
    tooltip,
  );
}

export interface RichTextEditorCommandButtonProps extends Omit<
  ComponentProps<typeof Button>,
  'isDisabled'
> {
  isActive?: boolean | ((editor: Editor) => boolean);
  isDisabled?: boolean | ((editor: Editor) => boolean);
  onCommand: (editor: Editor) => boolean | void;
  tooltip?: ReactNode;
}
function RichTextEditorCommandButton({
  children,
  className,
  isActive,
  isDisabled,
  onCommand,
  tooltip,
  ...props
}: RichTextEditorCommandButtonProps): ReactElement {
  const { editor, isDisabled: rootDisabled, isReadOnly } = useRichTextEditor();
  const commandState = useRichTextEditorState(
    ({ editor: current }) => ({
      isActive:
        typeof isActive === 'function' ? isActive(current) : Boolean(isActive),
      isDisabled:
        typeof isDisabled === 'function'
          ? isDisabled(current)
          : Boolean(isDisabled),
    }),
    (previous, next) =>
      previous?.isActive === next?.isActive &&
      previous?.isDisabled === next?.isDisabled,
  ) ?? { isActive: false, isDisabled: true };
  const selected = commandState.isActive;
  const disabled =
    rootDisabled || isReadOnly || !editor || commandState.isDisabled;
  return withEditorTooltip(
    <Button
      {...props}
      {...(selected ? { 'aria-pressed': true as const } : {})}
      className={(state) =>
        cn(
          'rich-text-editor__toolbar-button',
          typeof className === 'function' ? className(state) : className,
        ) ?? 'rich-text-editor__toolbar-button'
      }
      data-active={selected || undefined}
      data-slot='rich-text-editor-command-button'
      isDisabled={disabled}
      isIconOnly={props.isIconOnly ?? true}
      size={props.size ?? 'sm'}
      variant={props.variant ?? 'tertiary'}
      onPress={(event) => {
        if (editor && !disabled) onCommand(editor);
        props.onPress?.(event);
      }}
    >
      {children}
    </Button>,
    tooltip,
  );
}

function RichTextEditorContent({
  className,
  ...props
}: Omit<ComponentProps<typeof EditorContent>, 'editor'>): ReactElement {
  const { editor } = useRichTextEditor();
  return editor ? (
    <EditorContent
      {...props}
      className={cn('rich-text-editor__content', className)}
      data-slot='rich-text-editor-content'
      editor={editor}
    />
  ) : (
    <div
      className='rich-text-editor__loading'
      data-slot='rich-text-editor-loading'
    />
  );
}

export interface RichTextEditorBubbleMenuProps extends Omit<
  ComponentProps<typeof BubbleMenu>,
  'editor'
> {
  toolbarProps?: ComponentProps<typeof Toolbar>;
}
function RichTextEditorBubbleMenu({
  children,
  className,
  toolbarProps,
  ...props
}: RichTextEditorBubbleMenuProps): ReactElement | null {
  const { editor, isDisabled, isReadOnly } = useRichTextEditor();
  const {
    'aria-label': toolbarAriaLabel = 'Selection formatting toolbar',
    className: toolbarClassName,
    orientation = 'horizontal',
    ...toolbarRest
  } = toolbarProps ?? {};
  return editor ? (
    <BubbleMenu
      {...props}
      className={cn('rich-text-editor__bubble-menu', className)}
      editor={editor}
      shouldShow={(context) =>
        !isDisabled &&
        !isReadOnly &&
        (props.shouldShow
          ? props.shouldShow(context)
          : context.editor.isFocused && !context.editor.state.selection.empty)
      }
    >
      <Toolbar
        {...toolbarRest}
        aria-label={toolbarAriaLabel}
        className={(state) =>
          cn(
            'rich-text-editor__bubble-menu-toolbar',
            typeof toolbarClassName === 'function'
              ? toolbarClassName(state)
              : toolbarClassName,
          ) ?? 'rich-text-editor__bubble-menu-toolbar'
        }
        data-slot='rich-text-editor-bubble-menu-toolbar'
        orientation={orientation}
      >
        {children}
      </Toolbar>
    </BubbleMenu>
  ) : null;
}
export interface RichTextEditorFloatingMenuProps extends Omit<
  ComponentProps<typeof FloatingMenu>,
  'editor'
> {
  toolbarProps?: ComponentProps<typeof Toolbar>;
}
function RichTextEditorFloatingMenu({
  children,
  className,
  shouldShow,
  toolbarProps,
  ...props
}: RichTextEditorFloatingMenuProps): ReactElement | null {
  const { editor, isDisabled, isReadOnly } = useRichTextEditor();
  const visibility =
    isDisabled || isReadOnly
      ? { shouldShow: () => false }
      : shouldShow
        ? { shouldShow }
        : {};
  const {
    'aria-label': toolbarAriaLabel = 'Insertion toolbar',
    className: toolbarClassName,
    orientation = 'horizontal',
    ...toolbarRest
  } = toolbarProps ?? {};
  return editor ? (
    <FloatingMenu
      {...props}
      {...visibility}
      className={cn('rich-text-editor__floating-menu', className)}
      editor={editor}
    >
      <Toolbar
        {...toolbarRest}
        aria-label={toolbarAriaLabel}
        className={(state) =>
          cn(
            'rich-text-editor__floating-menu-toolbar',
            typeof toolbarClassName === 'function'
              ? toolbarClassName(state)
              : toolbarClassName,
          ) ?? 'rich-text-editor__floating-menu-toolbar'
        }
        data-slot='rich-text-editor-floating-menu-toolbar'
        orientation={orientation}
      >
        {children}
      </Toolbar>
    </FloatingMenu>
  ) : null;
}

export interface RichTextEditorCharacterCountProps extends Omit<
  ComponentPropsWithRef<'span'>,
  'children'
> {
  children?:
    | ReactNode
    | ((stats: {
        characters: number;
        isEmpty: boolean;
        words: number;
      }) => ReactNode);
  showWords?: boolean;
}
function RichTextEditorCharacterCount({
  children,
  className,
  showWords = false,
  ...props
}: RichTextEditorCharacterCountProps): ReactElement {
  const { editor, maxLength } = useRichTextEditor();
  const stats = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            characters: current.storage.characterCount?.characters() ?? 0,
            isEmpty: current.isEmpty,
            words: current.storage.characterCount?.words() ?? 0,
          }
        : { characters: 0, isEmpty: true, words: 0 },
  });
  const value = stats ?? { characters: 0, isEmpty: true, words: 0 };
  const content =
    typeof children === 'function'
      ? children(value)
      : (children ??
        `${value.characters}${maxLength ? ` / ${maxLength}` : ''} characters${showWords ? `, ${value.words} words` : ''}`);
  return (
    <span
      {...props}
      className={cn('rich-text-editor__character-count', className)}
      data-over-limit={
        (maxLength !== undefined && value.characters > maxLength) || undefined
      }
      data-slot='rich-text-editor-character-count'
    >
      {content}
    </span>
  );
}

interface LinkContextValue {
  apply: () => void;
  close: () => void;
  href: string;
  isDisabled: boolean;
  setHref: (value: string) => void;
  unset: () => void;
}
const LinkContext = createContext<LinkContextValue | null>(null);
function useLinkContext(): LinkContextValue {
  const value = useContext(LinkContext);
  if (!value)
    throw new Error(
      'RichTextEditor.LinkPopover subcomponents must be used within LinkPopover',
    );
  return value;
}
function LinkPopoverRoot({
  children,
  isOpen,
  onOpenChange,
  ...props
}: ComponentProps<typeof Popover>): ReactElement {
  const { editor, isDisabled, isReadOnly } = useRichTextEditor();
  const [href, setHref] = useState('');
  const [localOpen, setLocalOpen] = useState(false);
  const open = isOpen ?? localOpen;
  const setOpen = useCallback(
    (value: boolean) => {
      if (isOpen === undefined) setLocalOpen(value);
      onOpenChange?.(value);
    },
    [isOpen, onOpenChange],
  );
  const close = useCallback(() => setOpen(false), [setOpen]);
  const disabled = isDisabled || isReadOnly || !editor;
  const apply = useCallback(() => {
    if (!editor || disabled) return;
    const value = href.trim();
    if (value)
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({
          href: /^(https?:|mailto:|tel:|#|\/)/i.test(value)
            ? value
            : `https://${value}`,
        })
        .run();
    else editor.chain().focus().extendMarkRange('link').unsetLink().run();
    close();
  }, [close, disabled, editor, href]);
  const unset = useCallback(() => {
    if (editor && !disabled) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      close();
    }
  }, [close, disabled, editor]);
  const contextValue = useMemo(
    () => ({ apply, close, href, isDisabled: disabled, setHref, unset }),
    [apply, close, disabled, href, unset],
  );

  return (
    <LinkContext value={contextValue}>
      <Popover {...props} isOpen={open} onOpenChange={setOpen}>
        {children}
      </Popover>
    </LinkContext>
  );
}
function LinkPopoverTrigger({
  children,
  className,
  ...props
}: ComponentProps<typeof Button>): ReactElement {
  const { editor } = useRichTextEditor();
  const { isDisabled, setHref } = useLinkContext();
  const isActive =
    useEditorState({
      editor,
      selector: ({ editor: current }) => current?.isActive('link') ?? false,
    }) ?? false;
  return (
    <Popover.Trigger>
      <Button
        {...props}
        aria-label={props['aria-label'] ?? 'Link'}
        className={(state) =>
          cn(
            'rich-text-editor__toolbar-button',
            'rich-text-editor__link-popover-trigger',
            typeof className === 'function' ? className(state) : className,
          ) ?? 'rich-text-editor__toolbar-button'
        }
        data-active={isActive || undefined}
        data-slot='rich-text-editor-link-popover-trigger'
        isDisabled={isDisabled}
        isIconOnly={props.isIconOnly ?? true}
        size={props.size ?? 'sm'}
        variant={props.variant ?? 'ghost'}
        onPress={(event) => {
          setHref(editor?.getAttributes('link')['href'] ?? '');
          props.onPress?.(event);
        }}
      >
        {children ?? 'Link'}
      </Button>
    </Popover.Trigger>
  );
}
function LinkPopoverContent({
  children,
  className,
  ...props
}: ComponentProps<typeof Popover.Content>): ReactElement {
  return (
    <Popover.Content
      className={(state) =>
        cn(
          'rich-text-editor__link-popover',
          typeof className === 'function' ? className(state) : className,
        ) ?? 'rich-text-editor__link-popover'
      }
      data-slot='rich-text-editor-link-popover'
      placement={props.placement ?? 'bottom start'}
      {...props}
    >
      <Popover.Arrow />
      <Popover.Dialog
        className='rich-text-editor__link-popover-content'
        data-slot='rich-text-editor-link-popover-content'
      >
        {children}
      </Popover.Dialog>
    </Popover.Content>
  );
}
function LinkPopoverInput(props: ComponentProps<typeof Input>): ReactElement {
  const { href, isDisabled, setHref } = useLinkContext();
  return (
    <Input
      {...props}
      aria-label={props['aria-label'] ?? 'Link URL'}
      fullWidth
      className={
        cn('rich-text-editor__link-input', props.className) ??
        'rich-text-editor__link-input'
      }
      disabled={isDisabled || props.disabled || false}
      placeholder={props.placeholder ?? 'https://example.com'}
      value={String(props.value ?? href)}
      variant={props.variant ?? 'secondary'}
      onChange={(event) => {
        setHref(event.target.value);
        props.onChange?.(event);
      }}
    />
  );
}
const LinkPopoverActions: ReturnType<typeof slotDiv> = slotDiv(
  'rich-text-editor__link-popover-actions',
);
function LinkApplyButton({
  children = 'Apply',
  ...props
}: ComponentProps<typeof Button>): ReactElement {
  const { apply, href, isDisabled } = useLinkContext();
  return (
    <Button
      {...props}
      data-slot='rich-text-editor-link-apply-button'
      isDisabled={Boolean(isDisabled || props.isDisabled || !href.trim())}
      size={props.size ?? 'sm'}
      variant={props.variant ?? 'primary'}
      onPress={(event) => {
        apply();
        props.onPress?.(event);
      }}
    >
      {children}
    </Button>
  );
}
function LinkUnsetButton({
  children = 'Remove',
  ...props
}: ComponentProps<typeof Button>): ReactElement {
  const { editor } = useRichTextEditor();
  const { isDisabled, unset } = useLinkContext();
  const isActive =
    useEditorState({
      editor,
      selector: ({ editor: current }) => current?.isActive('link') ?? false,
    }) ?? false;
  return (
    <Button
      {...props}
      data-slot='rich-text-editor-link-unset-button'
      isDisabled={Boolean(isDisabled || props.isDisabled || !isActive)}
      size={props.size ?? 'sm'}
      variant={props.variant ?? 'tertiary'}
      onPress={(event) => {
        unset();
        props.onPress?.(event);
      }}
    >
      {children}
    </Button>
  );
}
type LinkPopoverComponent = typeof LinkPopoverRoot & {
  Actions: typeof LinkPopoverActions;
  ApplyButton: typeof LinkApplyButton;
  Content: typeof LinkPopoverContent;
  Input: typeof LinkPopoverInput;
  Root: typeof LinkPopoverRoot;
  Trigger: typeof LinkPopoverTrigger;
  UnsetButton: typeof LinkUnsetButton;
};
const RichTextEditorLinkPopover: LinkPopoverComponent = Object.assign(
  LinkPopoverRoot,
  {
    Actions: LinkPopoverActions,
    ApplyButton: LinkApplyButton,
    Content: LinkPopoverContent,
    Input: LinkPopoverInput,
    Root: LinkPopoverRoot,
    Trigger: LinkPopoverTrigger,
    UnsetButton: LinkUnsetButton,
  },
);

export interface RichTextEditorSuggestionItem {
  command?: (props: {
    editor: Editor;
    item: RichTextEditorSuggestionItem;
    query: string;
    range: { from: number; to: number };
    text: string;
  }) => void;
  description?: string;
  icon?: ReactNode;
  id?: string;
  keywords?: string[];
  title: string;
}
export function filterRichTextEditorSuggestionItems(
  items: RichTextEditorSuggestionItem[],
  query: string,
): RichTextEditorSuggestionItem[] {
  const normalized = query.trim().toLowerCase();
  return normalized
    ? items.filter((item) =>
        [item.title, ...(item.keywords ?? [])]
          .join(' ')
          .toLowerCase()
          .includes(normalized),
      )
    : items;
}
export interface RichTextEditorSuggestionRenderProps {
  editor: Editor;
  isOpen: boolean;
  items: RichTextEditorSuggestionItem[];
  query: string;
  range: { from: number; to: number };
  selectItem: (item: RichTextEditorSuggestionItem) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  text: string;
}
export interface RichTextEditorSuggestionMenuProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'onSelect'
> {
  allowedPrefixes?: null | string[];
  allowSpaces?: boolean;
  char?: string;
  children?: (props: RichTextEditorSuggestionRenderProps) => ReactNode;
  items: (props: {
    editor: Editor;
    query: string;
  }) =>
    RichTextEditorSuggestionItem[] | Promise<RichTextEditorSuggestionItem[]>;
  maxHeight?: number;
  onSelect?: (props: {
    editor: Editor;
    item: RichTextEditorSuggestionItem;
    query: string;
    range: { from: number; to: number };
    text: string;
  }) => void;
  pluginKey?: PluginKey | string;
  startOfLine?: boolean;
}
interface SuggestionState {
  clientRect: (() => DOMRect | null) | null | undefined;
  props: SuggestionProps<RichTextEditorSuggestionItem>;
}
function RichTextEditorSuggestionMenu({
  allowedPrefixes = defaultSuggestionPrefixes,
  allowSpaces = false,
  char = '/',
  children,
  className,
  items,
  maxHeight = 384,
  onSelect,
  pluginKey,
  startOfLine = false,
  style,
  ...props
}: RichTextEditorSuggestionMenuProps): ReactElement | null {
  const { editor, isDisabled, isReadOnly } = useRichTextEditor();
  const [menu, setMenu] = useState<SuggestionState | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const latest = useRef({ items, onSelect });
  const menuRef = useRef<SuggestionState | null>(null);
  const selectedIndexRef = useRef(0);
  latest.current = { items, onSelect };
  const updateMenu = useCallback((value: SuggestionState | null) => {
    menuRef.current = value;
    setMenu(value);
  }, []);
  const updateSelectedIndex = useCallback(
    (value: number | ((current: number) => number)) => {
      const next =
        typeof value === 'function' ? value(selectedIndexRef.current) : value;
      selectedIndexRef.current = next;
      setSelectedIndex(next);
    },
    [],
  );
  const select = useCallback(
    (index: number, current = menuRef.current) => {
      if (!current) return;
      const item = current.props.items[index];
      if (!item) return;
      const payload = {
        editor: current.props.editor,
        item,
        query: current.props.query,
        range: current.props.range,
        text: current.props.text,
      };
      if (latest.current.onSelect) latest.current.onSelect(payload);
      else if (item.command) item.command(payload);
      else
        current.props.editor
          .chain()
          .focus()
          .deleteRange(current.props.range)
          .insertContent(item.title)
          .run();
      current.props.command(item);
      updateMenu(null);
    },
    [updateMenu],
  );
  const resolvedPluginKey = useMemo(
    () =>
      pluginKey instanceof PluginKey
        ? pluginKey
        : new PluginKey(
            pluginKey ??
              `rich-text-editor-suggestion-${char.codePointAt(0) ?? 0}-${char.length}`,
          ),
    [char, pluginKey],
  );
  useEffect(() => {
    if (!editor || isDisabled || isReadOnly) return;
    const plugin = Suggestion<RichTextEditorSuggestionItem>({
      allowedPrefixes,
      allowSpaces,
      char,
      decorationClass: 'rich-text-editor__suggestion-decoration',
      editor,
      pluginKey: resolvedPluginKey,
      startOfLine,
      items: ({ editor: current, query }) =>
        latest.current.items({ editor: current, query }),
      command: () => undefined,
      render: () => ({
        onStart: (suggestionProps) => {
          updateSelectedIndex(0);
          updateMenu({
            clientRect: suggestionProps.clientRect,
            props: suggestionProps,
          });
        },
        onUpdate: (suggestionProps) => {
          updateSelectedIndex(0);
          updateMenu({
            clientRect: suggestionProps.clientRect,
            props: suggestionProps,
          });
        },
        onExit: () => updateMenu(null),
        onKeyDown: ({ event }) => {
          if (event.key === 'Escape') {
            updateMenu(null);
            return true;
          }
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            updateSelectedIndex((value) => {
              const count = menuRef.current?.props.items.length ?? 1;
              return event.key === 'ArrowUp'
                ? (value + count - 1) % count
                : (value + 1) % count;
            });
            return true;
          }
          if (event.key === 'Enter') {
            select(selectedIndexRef.current);
            return true;
          }
          return false;
        },
      }),
    });
    editor.registerPlugin(plugin);
    return () => {
      editor.unregisterPlugin(resolvedPluginKey);
      updateMenu(null);
    };
  }, [
    allowedPrefixes,
    allowSpaces,
    char,
    editor,
    isDisabled,
    isReadOnly,
    resolvedPluginKey,
    select,
    startOfLine,
    updateMenu,
    updateSelectedIndex,
  ]);
  if (!menu) return null;
  const rect = menu.clientRect?.();
  const position: CSSProperties = rect
    ? { left: rect.left, position: 'fixed', top: rect.bottom + 6 }
    : {};
  const renderProps: RichTextEditorSuggestionRenderProps = {
    editor: menu.props.editor,
    isOpen: true,
    items: menu.props.items,
    query: menu.props.query,
    range: menu.props.range,
    selectItem: (item) => {
      const index = menu.props.items.indexOf(item);
      if (index >= 0) select(index, menu);
    },
    selectedIndex,
    setSelectedIndex: updateSelectedIndex,
    text: menu.props.text,
  };
  const suggestionItems = menu.props.items.map((item, index) => ({
    index,
    item,
    key: item.id ?? `${item.title}-${index}`,
  }));
  const selectedKey = suggestionItems[selectedIndex]?.key;
  const suggestionMenu = (
    <div
      {...props}
      className={cn('rich-text-editor__suggestion-menu', className)}
      data-slot='rich-text-editor-suggestion-menu'
      style={{ ...position, ...style }}
    >
      {children ? (
        children(renderProps)
      ) : (
        <ListBox
          aria-label='Suggestions'
          className='rich-text-editor__suggestion-menu-list'
          data-slot='rich-text-editor-suggestion-menu-list'
          selectedKeys={selectedKey ? [selectedKey] : []}
          selectionMode='single'
          style={{ maxHeight }}
          onAction={(key) => {
            const suggestion = suggestionItems.find(
              (entry) => entry.key === key,
            );
            if (suggestion) select(suggestion.index, menu);
          }}
        >
          {menu.props.items.length ? (
            suggestionItems.map(({ index, item, key }) => (
              <ListBox.Item
                className='rich-text-editor__suggestion-menu-item'
                data-selected={index === selectedIndex || undefined}
                data-slot='rich-text-editor-suggestion-menu-item'
                id={key}
                key={key}
                textValue={item.title}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => updateSelectedIndex(index)}
              >
                {item.icon ? (
                  <span
                    className='rich-text-editor__suggestion-menu-icon'
                    data-slot='rich-text-editor-suggestion-menu-icon'
                  >
                    {item.icon}
                  </span>
                ) : null}
                <span
                  className='rich-text-editor__suggestion-menu-item-content'
                  data-slot='rich-text-editor-suggestion-menu-item-content'
                >
                  <span
                    className='rich-text-editor__suggestion-menu-title'
                    data-slot='rich-text-editor-suggestion-menu-title'
                  >
                    {item.title}
                  </span>
                  {item.description ? (
                    <span
                      className='rich-text-editor__suggestion-menu-description'
                      data-slot='rich-text-editor-suggestion-menu-description'
                    >
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </ListBox.Item>
            ))
          ) : (
            <div
              className='rich-text-editor__suggestion-menu-empty'
              data-slot='rich-text-editor-suggestion-menu-empty'
            >
              No results
            </div>
          )}
        </ListBox>
      )}
    </div>
  );
  return typeof document === 'undefined'
    ? suggestionMenu
    : createPortal(suggestionMenu, document.body);
}

type RichTextEditorComponent = typeof RichTextEditorRoot & {
  ActionButton: typeof RichTextEditorActionButton;
  BubbleMenu: typeof RichTextEditorBubbleMenu;
  CharacterCount: typeof RichTextEditorCharacterCount;
  CommandButton: typeof RichTextEditorCommandButton;
  Content: typeof RichTextEditorContent;
  FloatingMenu: typeof RichTextEditorFloatingMenu;
  Footer: typeof RichTextEditorFooter;
  LinkPopover: typeof RichTextEditorLinkPopover;
  Root: typeof RichTextEditorRoot;
  Shell: typeof RichTextEditorShell;
  SuggestionMenu: typeof RichTextEditorSuggestionMenu;
  ToggleButton: typeof RichTextEditorToggleButton;
  Toolbar: typeof RichTextEditorToolbar;
  ToolbarGroup: typeof RichTextEditorToolbarGroup;
  ToolbarSeparator: typeof RichTextEditorToolbarSeparator;
};
export const RichTextEditor: RichTextEditorComponent = Object.assign(
  RichTextEditorRoot,
  {
    ActionButton: RichTextEditorActionButton,
    BubbleMenu: RichTextEditorBubbleMenu,
    CharacterCount: RichTextEditorCharacterCount,
    CommandButton: RichTextEditorCommandButton,
    Content: RichTextEditorContent,
    FloatingMenu: RichTextEditorFloatingMenu,
    Footer: RichTextEditorFooter,
    LinkPopover: RichTextEditorLinkPopover,
    Root: RichTextEditorRoot,
    Shell: RichTextEditorShell,
    SuggestionMenu: RichTextEditorSuggestionMenu,
    ToggleButton: RichTextEditorToggleButton,
    Toolbar: RichTextEditorToolbar,
    ToolbarGroup: RichTextEditorToolbarGroup,
    ToolbarSeparator: RichTextEditorToolbarSeparator,
  },
);

export type { Editor, Extensions, JSONContent };
