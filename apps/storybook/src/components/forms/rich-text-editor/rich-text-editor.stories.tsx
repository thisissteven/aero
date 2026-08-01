import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import {
  AddCircleIcon,
  Calendar03Icon,
  CodeSquareIcon,
  Delete02Icon,
  EraserIcon,
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  Link01Icon,
  QuoteUpIcon,
  Redo02Icon,
  SourceCodeIcon,
  SparklesIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
  Undo02Icon,
} from '@aero/ui/icons';
import { HugeiconsIcon, type IconSvgElement } from '@aero/ui/icons';

import { Button } from '@/components/buttons/button';

import {
  filterRichTextEditorSuggestionItems,
  type JSONContent,
  RichTextEditor,
} from './index';

const meta = {
  component: RichTextEditor,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Forms/RichTextEditor',
} satisfies Meta<typeof RichTextEditor>;
export default meta;
type Story = StoryObj<any>;

const article: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Features' }],
    },
    {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              marks: [{ type: 'italic' }],
              text: 'A composable rich text editor with toolbar controls, contextual menus, JSON persistence, and common writing shortcuts.',
              type: 'text',
            },
            { text: ' Try markdown ', type: 'text' },
            { marks: [{ type: 'code' }], text: '**', type: 'text' },
            {
              text: ' or keyboard shortcuts for common marks.',
              type: 'text',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { text: 'Select the phrase ', type: 'text' },
        {
          marks: [{ type: 'bold' }],
          text: 'contextual selection actions',
          type: 'text',
        },
        {
          text: ' and use the bubble menu to apply bold, italic, underline, strike, or a link without leaving the document.',
          type: 'text',
        },
      ],
    },
    {
      attrs: { level: 3 },
      content: [{ text: 'What to try', type: 'text' }],
      type: 'heading',
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  text: 'Use the toolbar to switch headings, lists, quotes, and code blocks.',
                  type: 'text',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { text: 'Add a link to ', type: 'text' },
                {
                  marks: [
                    { attrs: { href: 'https://tiptap.dev' }, type: 'link' },
                  ],
                  text: 'tiptap.dev',
                  type: 'text',
                },
                {
                  text: ' or remove formatting with the clear actions.',
                  type: 'text',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { text: 'Notice how ', type: 'text' },
                {
                  marks: [{ type: 'code' }],
                  text: 'onValueChange',
                  type: 'text',
                },
                {
                  text: ' can store JSON while still exposing HTML and text details.',
                  type: 'text',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'codeBlock',
      content: [
        {
          text: 'editor.chain().focus().toggleHeading({ level: 2 }).run()',
          type: 'text',
        },
      ],
    },
    { type: 'paragraph' },
  ],
};
const controlledArticle: JSONContent = {
  type: 'doc',
  content: [
    {
      attrs: { level: 2 },
      content: [{ text: 'Controlled JSON value', type: 'text' }],
      type: 'heading',
    },
    {
      type: 'paragraph',
      content: [
        {
          text: 'This demo keeps the editor document in React state. The buttons above replace the ',
          type: 'text',
        },
        { marks: [{ type: 'code' }], text: 'value', type: 'text' },
        {
          text: ' prop, and the JSON preview below updates after every edit.',
          type: 'text',
        },
      ],
    },
    {
      content: [
        {
          content: [
            {
              content: [
                {
                  text: 'Edit this paragraph and watch the JSON mirror change.',
                  type: 'text',
                },
              ],
              type: 'paragraph',
            },
          ],
          type: 'listItem',
        },
        {
          content: [
            {
              content: [
                { text: 'The footer reads ', type: 'text' },
                {
                  marks: [{ type: 'bold' }],
                  text: 'character',
                  type: 'text',
                },
                { text: ' and ', type: 'text' },
                {
                  marks: [{ type: 'italic' }],
                  text: 'word',
                  type: 'text',
                },
                {
                  text: ' counts from Tiptap storage.',
                  type: 'text',
                },
              ],
              type: 'paragraph',
            },
          ],
          type: 'listItem',
        },
      ],
      type: 'bulletList',
    },
    {
      content: [
        {
          content: [
            {
              text: 'Controlled mode should feel editable, not fragile: external updates only replace content when the incoming JSON differs.',
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
      ],
      type: 'blockquote',
    },
    { type: 'paragraph' },
  ],
};

const releaseNote: JSONContent = {
  type: 'doc',
  content: [
    {
      attrs: { level: 2 },
      content: [{ text: 'Loaded release note', type: 'text' }],
      type: 'heading',
    },
    {
      content: [
        {
          text: 'Switching documents should preserve the same toolbar, footer, and editor shell while replacing the serialized ',
          type: 'text',
        },
        { marks: [{ type: 'code' }], text: 'JSONContent', type: 'text' },
        { text: ' value.', type: 'text' },
      ],
      type: 'paragraph',
    },
  ],
};

const countArticle: JSONContent = {
  type: 'doc',
  content: [
    {
      attrs: { level: 2 },
      content: [{ text: 'Character count', type: 'text' }],
      type: 'heading',
    },
    {
      content: [
        {
          text: 'This editor has a 240 character limit. Keep typing to see the footer update in real time and flag when the document crosses the configured ceiling.',
          type: 'text',
        },
      ],
      type: 'paragraph',
    },
    {
      content: [
        {
          content: [
            {
              content: [{ text: 'Short notes stay green.', type: 'text' }],
              type: 'paragraph',
            },
          ],
          type: 'listItem',
        },
      ],
      type: 'bulletList',
    },
    { type: 'paragraph' },
  ],
};

const customArticle: JSONContent = {
  type: 'doc',
  content: [
    {
      attrs: { level: 2 },
      content: [{ text: 'Custom composition', type: 'text' }],
      type: 'heading',
    },
    {
      content: [
        {
          text: 'This demo moves a compact toolbar into the footer. The editor keeps the same Tiptap instance, but you decide where controls live.',
          type: 'text',
        },
      ],
      type: 'paragraph',
    },
    {
      content: [
        {
          content: [
            {
              content: [
                {
                  text: 'Only bold, italic, list, and link controls are exposed here.',
                  type: 'text',
                },
              ],
              type: 'paragraph',
            },
          ],
          type: 'listItem',
        },
        {
          content: [
            {
              content: [
                {
                  text: 'The content area remains the same reusable slot.',
                  type: 'text',
                },
              ],
              type: 'paragraph',
            },
          ],
          type: 'listItem',
        },
      ],
      type: 'bulletList',
    },
    {
      content: [
        {
          content: [
            {
              text: 'Compound parts make layout a product decision instead of a component limitation.',
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
      ],
      type: 'blockquote',
    },
    { type: 'paragraph' },
  ],
};

const extensibleArticle: JSONContent = {
  type: 'doc',
  content: [
    {
      attrs: { level: 2 },
      content: [{ text: 'Extensible commands', type: 'text' }],
      type: 'heading',
    },
    {
      content: [
        {
          text: 'This demo adds custom buttons, a floating insert menu, and a slash command menu. Type ',
          type: 'text',
        },
        { marks: [{ type: 'code' }], text: '/', type: 'text' },
        { text: ' to open the command list, then filter with ', type: 'text' },
        { marks: [{ type: 'code' }], text: 'h', type: 'text' },
        { text: ', ', type: 'text' },
        { marks: [{ type: 'code' }], text: 'list', type: 'text' },
        { text: ', ', type: 'text' },
        { marks: [{ type: 'code' }], text: 'quote', type: 'text' },
        { text: ', or ', type: 'text' },
        { marks: [{ type: 'code' }], text: 'action', type: 'text' },
        { text: '.', type: 'text' },
      ],
      type: 'paragraph',
    },
    {
      content: [
        {
          content: [
            {
              text: 'Each item runs your own Tiptap command; the component only supplies the accessible menu shell.',
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
      ],
      type: 'blockquote',
    },
    {
      attrs: { level: 3 },
      content: [{ text: 'Try it', type: 'text' }],
      type: 'heading',
    },
    {
      content: [
        "Press the date button to insert today's date.",
        'Use the sparkle button to insert a launch checklist.',
        'Move to the empty line below to reveal the floating menu.',
      ].map((text) => ({
        content: [{ content: [{ text, type: 'text' }], type: 'paragraph' }],
        type: 'listItem',
      })),
      type: 'bulletList',
    },
    { type: 'paragraph' },
  ],
};

function Tool({
  command,
  icon,
  tooltip,
}: {
  command: Parameters<typeof RichTextEditor.ToggleButton>[0]['command'];
  icon: IconSvgElement;
  tooltip: string;
}) {
  return (
    <RichTextEditor.ToggleButton command={command} tooltip={tooltip}>
      <HugeiconsIcon
        aria-hidden
        className='size-4'
        icon={icon}
        strokeWidth={2}
      />
    </RichTextEditor.ToggleButton>
  );
}

function LinkTool() {
  return (
    <RichTextEditor.LinkPopover>
      <RichTextEditor.LinkPopover.Trigger>
        <HugeiconsIcon
          aria-hidden
          className='size-4'
          icon={Link01Icon}
          strokeWidth={2}
        />
      </RichTextEditor.LinkPopover.Trigger>
      <RichTextEditor.LinkPopover.Content>
        <RichTextEditor.LinkPopover.Input />
        <RichTextEditor.LinkPopover.Actions>
          <RichTextEditor.LinkPopover.UnsetButton />
          <RichTextEditor.LinkPopover.ApplyButton />
        </RichTextEditor.LinkPopover.Actions>
      </RichTextEditor.LinkPopover.Content>
    </RichTextEditor.LinkPopover>
  );
}

function Action({
  action,
  icon,
  tooltip,
}: {
  action: Parameters<typeof RichTextEditor.ActionButton>[0]['action'];
  icon: IconSvgElement;
  tooltip: string;
}) {
  return (
    <RichTextEditor.ActionButton action={action} tooltip={tooltip}>
      <HugeiconsIcon
        aria-hidden
        className='size-4'
        icon={icon}
        strokeWidth={2}
      />
    </RichTextEditor.ActionButton>
  );
}

function Toolbar() {
  return (
    <RichTextEditor.Toolbar>
      <RichTextEditor.ToolbarGroup aria-label='History'>
        <Action action='undo' icon={Undo02Icon} tooltip='Undo' />
        <Action action='redo' icon={Redo02Icon} tooltip='Redo' />
      </RichTextEditor.ToolbarGroup>
      <RichTextEditor.ToolbarSeparator />
      <RichTextEditor.ToolbarGroup aria-label='Text style'>
        <Tool command='bold' icon={TextBoldIcon} tooltip='Bold' />
        <Tool command='italic' icon={TextItalicIcon} tooltip='Italic' />
        <Tool
          command='underline'
          icon={TextUnderlineIcon}
          tooltip='Underline'
        />
        <Tool
          command='strike'
          icon={TextStrikethroughIcon}
          tooltip='Strikethrough'
        />
        <Tool command='code' icon={SourceCodeIcon} tooltip='Inline code' />
      </RichTextEditor.ToolbarGroup>
      <RichTextEditor.ToolbarSeparator />
      <RichTextEditor.ToolbarGroup aria-label='Blocks'>
        <Tool command='heading-1' icon={Heading01Icon} tooltip='Heading 1' />
        <Tool command='heading-2' icon={Heading02Icon} tooltip='Heading 2' />
        <Tool command='heading-3' icon={Heading03Icon} tooltip='Heading 3' />
        <Tool command='blockquote' icon={QuoteUpIcon} tooltip='Blockquote' />
        <Tool command='codeBlock' icon={CodeSquareIcon} tooltip='Code block' />
      </RichTextEditor.ToolbarGroup>
      <RichTextEditor.ToolbarSeparator />
      <RichTextEditor.ToolbarGroup aria-label='Lists and links'>
        <Tool
          command='bulletList'
          icon={LeftToRightListBulletIcon}
          tooltip='Bulleted list'
        />
        <Tool
          command='orderedList'
          icon={LeftToRightListNumberIcon}
          tooltip='Numbered list'
        />
        <LinkTool />
      </RichTextEditor.ToolbarGroup>
      <RichTextEditor.ToolbarSeparator />
      <RichTextEditor.ToolbarGroup aria-label='Clear'>
        <Action
          action='clearFormatting'
          icon={EraserIcon}
          tooltip='Clear formatting'
        />
        <Action
          action='clearContent'
          icon={Delete02Icon}
          tooltip='Clear content'
        />
      </RichTextEditor.ToolbarGroup>
    </RichTextEditor.Toolbar>
  );
}
function BubbleTools() {
  return (
    <RichTextEditor.BubbleMenu>
      <Tool command='bold' icon={TextBoldIcon} tooltip='Bold' />
      <Tool command='italic' icon={TextItalicIcon} tooltip='Italic' />
      <Tool command='underline' icon={TextUnderlineIcon} tooltip='Underline' />
      <Tool
        command='strike'
        icon={TextStrikethroughIcon}
        tooltip='Strikethrough'
      />
      <LinkTool />
    </RichTextEditor.BubbleMenu>
  );
}
function Editor({
  children,
  footerLabel = 'JSON-first editor state',
  ...props
}: Parameters<typeof RichTextEditor>[0] & { footerLabel?: string }) {
  return (
    <RichTextEditor {...props}>
      <RichTextEditor.Shell>
        {children ?? (
          <>
            <Toolbar />
            <RichTextEditor.Content />
            <BubbleTools />
            <RichTextEditor.Footer>
              <span>{footerLabel}</span>
              <RichTextEditor.CharacterCount showWords />
            </RichTextEditor.Footer>
          </>
        )}
      </RichTextEditor.Shell>
    </RichTextEditor>
  );
}

export const Default: Story = {
  render: () => (
    <div className='w-[760px]'>
      <Editor defaultValue={article} />
    </div>
  ),
};
export const Controlled: Story = {
  render: function Demo() {
    const [value, setValue] = useState<JSONContent>(controlledArticle);
    const [stats, setStats] = useState<{
      characterCount: number;
      wordCount: number;
    } | null>(null);
    return (
      <div className='flex w-full max-w-[760px] flex-col gap-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            size='sm'
            variant='secondary'
            onPress={() => setValue(controlledArticle)}
          >
            Load Guide
          </Button>
          <Button
            size='sm'
            variant='secondary'
            onPress={() => setValue(releaseNote)}
          >
            Load Notes
          </Button>
          {stats ? (
            <span className='text-muted text-xs sm:ml-auto'>
              {stats.characterCount} chars, {stats.wordCount} words
            </span>
          ) : null}
        </div>
        <Editor
          footerLabel='Controlled JSON value'
          value={value}
          onValueChange={(nextValue, details) => {
            setValue(nextValue);
            setStats({
              characterCount: details.characterCount,
              wordCount: details.wordCount,
            });
          }}
        />
        <pre className='bg-default text-muted max-h-[220px] overflow-auto rounded-2xl p-3 text-xs break-words whitespace-pre-wrap'>
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    );
  },
};
export const CharacterCount: Story = {
  render: () => (
    <div className='w-[680px]'>
      <Editor
        defaultValue={countArticle}
        footerLabel='240 character limit'
        maxLength={240}
      />
    </div>
  ),
};
export const Placeholder: Story = {
  render: () => (
    <div className='w-[680px]'>
      <Editor
        footerLabel='Empty state'
        placeholder='Start a component note: describe the editor, type **bold**, then select text for the bubble menu...'
      />
    </div>
  ),
};
export const Disabled: Story = {
  render: () => (
    <div className='grid w-full max-w-[860px] grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4'>
      <Editor
        isDisabled
        defaultValue={{
          type: 'doc',
          content: [
            {
              attrs: { level: 3 },
              content: [{ text: 'Disabled state', type: 'text' }],
              type: 'heading',
            },
            {
              content: [
                {
                  text: 'Use disabled mode when the entire field is unavailable. Toolbar actions, editing, and link changes are all blocked.',
                  type: 'text',
                },
              ],
              type: 'paragraph',
            },
            {
              content: [
                {
                  content: [
                    {
                      content: [
                        {
                          text: 'Best for locked forms or pending permissions.',
                          type: 'text',
                        },
                      ],
                      type: 'paragraph',
                    },
                  ],
                  type: 'listItem',
                },
              ],
              type: 'bulletList',
            },
            { type: 'paragraph' },
          ],
        }}
        footerLabel='Disabled'
      />
      <Editor
        isReadOnly
        defaultValue={{
          type: 'doc',
          content: [
            {
              attrs: { level: 3 },
              content: [{ text: 'Read-only review', type: 'text' }],
              type: 'heading',
            },
            {
              content: [
                {
                  text: 'Read-only mode keeps the same visual surface and selectable text while preventing document mutations.',
                  type: 'text',
                },
              ],
              type: 'paragraph',
            },
            {
              content: [
                {
                  content: [
                    {
                      content: [
                        {
                          text: 'Best for review screens, previews, and archived records.',
                          type: 'text',
                        },
                      ],
                      type: 'paragraph',
                    },
                  ],
                  type: 'listItem',
                },
              ],
              type: 'bulletList',
            },
            { type: 'paragraph' },
          ],
        }}
        footerLabel='Read only'
      />
    </div>
  ),
};
export const CustomComposition: Story = {
  render: () => (
    <div className='w-[600px]'>
      <RichTextEditor defaultValue={customArticle}>
        <RichTextEditor.Shell>
          <RichTextEditor.Content />
          <RichTextEditor.Footer>
            <RichTextEditor.Toolbar
              aria-label='Compact editor toolbar'
              className='min-h-0 border-0 p-0'
            >
              <RichTextEditor.ToolbarGroup>
                <Tool command='bold' icon={TextBoldIcon} tooltip='Bold' />
                <Tool command='italic' icon={TextItalicIcon} tooltip='Italic' />
                <Tool
                  command='bulletList'
                  icon={LeftToRightListBulletIcon}
                  tooltip='Bulleted list'
                />
                <LinkTool />
              </RichTextEditor.ToolbarGroup>
            </RichTextEditor.Toolbar>
            <RichTextEditor.CharacterCount />
          </RichTextEditor.Footer>
        </RichTextEditor.Shell>
      </RichTextEditor>
    </div>
  ),
};
export const Extensible: Story = {
  render: () => (
    <div className='w-[720px]'>
      <RichTextEditor
        defaultValue={extensibleArticle}
        placeholder='Write notes...'
      >
        <RichTextEditor.Shell>
          <RichTextEditor.Toolbar>
            <RichTextEditor.ToolbarGroup aria-label='Custom commands'>
              <RichTextEditor.CommandButton
                aria-label='Insert date'
                tooltip='Insert date'
                onCommand={(editor) =>
                  editor
                    .chain()
                    .focus()
                    .insertContent(
                      new Intl.DateTimeFormat('en', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }).format(new Date()),
                    )
                    .run()
                }
              >
                <HugeiconsIcon
                  aria-hidden
                  className='size-4'
                  icon={Calendar03Icon}
                  strokeWidth={2}
                />
              </RichTextEditor.CommandButton>
              <RichTextEditor.CommandButton
                aria-label='Insert launch checklist'
                tooltip='Insert checklist'
                onCommand={(editor) =>
                  editor
                    .chain()
                    .focus()
                    .insertContent('Preflight checklist')
                    .run()
                }
              >
                <HugeiconsIcon
                  aria-hidden
                  className='size-4'
                  icon={SparklesIcon}
                  strokeWidth={2}
                />
              </RichTextEditor.CommandButton>
            </RichTextEditor.ToolbarGroup>
          </RichTextEditor.Toolbar>
          <RichTextEditor.Content />
          <RichTextEditor.FloatingMenu>
            <RichTextEditor.CommandButton
              aria-label='Add heading'
              tooltip='Add heading'
              onCommand={(editor) =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              <HugeiconsIcon
                aria-hidden
                className='size-4'
                icon={AddCircleIcon}
                strokeWidth={2}
              />
            </RichTextEditor.CommandButton>
          </RichTextEditor.FloatingMenu>
          <RichTextEditor.SuggestionMenu
            items={({ query }) =>
              filterRichTextEditorSuggestionItems(
                [
                  {
                    title: 'Heading 1',
                    keywords: ['title', 'h1'],
                    icon: (
                      <HugeiconsIcon
                        aria-hidden
                        className='size-4'
                        icon={Heading01Icon}
                        strokeWidth={2}
                      />
                    ),
                    command: ({ editor, range }) =>
                      editor
                        .chain()
                        .focus()
                        .deleteRange(range)
                        .setHeading({ level: 1 })
                        .run(),
                  },
                  {
                    title: 'Bulleted list',
                    keywords: ['list', 'bullet'],
                    icon: (
                      <HugeiconsIcon
                        aria-hidden
                        className='size-4'
                        icon={LeftToRightListBulletIcon}
                        strokeWidth={2}
                      />
                    ),
                    command: ({ editor, range }) =>
                      editor
                        .chain()
                        .focus()
                        .deleteRange(range)
                        .toggleBulletList()
                        .run(),
                  },
                  {
                    title: 'Blockquote',
                    keywords: ['quote', 'note'],
                    icon: (
                      <HugeiconsIcon
                        aria-hidden
                        className='size-4'
                        icon={QuoteUpIcon}
                        strokeWidth={2}
                      />
                    ),
                    command: ({ editor, range }) =>
                      editor
                        .chain()
                        .focus()
                        .deleteRange(range)
                        .toggleBlockquote()
                        .run(),
                  },
                  {
                    title: 'Action callout',
                    keywords: ['todo', 'action', 'custom'],
                    icon: (
                      <HugeiconsIcon
                        aria-hidden
                        className='size-4'
                        icon={SparklesIcon}
                        strokeWidth={2}
                      />
                    ),
                    command: ({ editor, range }) =>
                      editor
                        .chain()
                        .focus()
                        .deleteRange(range)
                        .insertContent({
                          content: [
                            {
                              content: [
                                { text: 'Action item: ', type: 'text' },
                              ],
                              type: 'paragraph',
                            },
                          ],
                          type: 'blockquote',
                        })
                        .run(),
                  },
                ],
                query,
              )
            }
          />
          <RichTextEditor.Footer>
            <span>Extensible command surface</span>
            <RichTextEditor.CharacterCount showWords />
          </RichTextEditor.Footer>
        </RichTextEditor.Shell>
      </RichTextEditor>
    </div>
  ),
};
