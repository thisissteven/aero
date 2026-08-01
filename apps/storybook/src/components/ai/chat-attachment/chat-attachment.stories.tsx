import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useRef, useState } from 'react';

import { ArrowUp01Icon, Attachment01Icon } from '@aero/ui/icons';
import { HugeiconsIcon } from '@aero/ui/icons';

import {
  ChatAttachment,
  ChatAttachmentGroup,
  ChatAttachmentInput,
  ChatMessage,
  PromptInput,
} from './index';
const image = '/assets/images/egg.webp';
const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/AI/ChatAttachment',
} satisfies Meta;
export default meta;
type Story = StoryObj<any>;
export const Default: Story = {
  render: () => (
    <ChatMessage.User>
      <ChatAttachmentGroup className='mb-2'>
        <ChatAttachment mediaType='image' name='screenshot.png' src={image} />
      </ChatAttachmentGroup>
      <ChatMessage.Bubble>
        <ChatMessage.Content>What is in this screenshot?</ChatMessage.Content>
      </ChatMessage.Bubble>
    </ChatMessage.User>
  ),
};
export const Grouped: Story = {
  render: () => (
    <ChatAttachmentGroup>
      <ChatAttachment mimeType='application/pdf' name='brief.pdf' />
      <ChatAttachment mediaType='image' name='wireframe.png' src={image} />
      <ChatAttachment mediaType='image' name='screenshot.png' src={image} />
    </ChatAttachmentGroup>
  ),
};
interface Attachment {
  id: string;
  mimeType: string;
  name: string;
  src?: string;
}
function ComposerDemo() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const refs = useRef<Attachment[]>([]);
  useEffect(() => {
    refs.current = attachments;
  }, [attachments]);
  useEffect(
    () => () =>
      refs.current.forEach((item) => {
        if (item.src?.startsWith('blob:')) URL.revokeObjectURL(item.src);
      }),
    [],
  );
  const add = (files: File[]) =>
    setAttachments((values) => [
      ...values,
      ...files.map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        mimeType: file.type,
        name: file.name,
        src: file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined,
      })),
    ]);
  return (
    <PromptInput className='max-w-xl'>
      <ChatAttachmentInput onFilesSelected={add}>
        <ChatAttachmentInput.Dropzone
          render={(dropProps) => (
            <PromptInput.Shell {...dropProps}>
              <PromptInput.Content>
                {attachments.length ? (
                  <PromptInput.Attachments>
                    <ChatAttachmentGroup>
                      {attachments.map((item) => (
                        <ChatAttachment
                          key={item.id}
                          mimeType={item.mimeType}
                          name={item.name}
                          src={item.src}
                        >
                          <ChatAttachment.Preview />
                          <ChatAttachment.Remove
                            aria-label='Remove attachment'
                            onPress={() =>
                              setAttachments((values) =>
                                values.filter((value) => value.id !== item.id),
                              )
                            }
                          />
                        </ChatAttachment>
                      ))}
                    </ChatAttachmentGroup>
                  </PromptInput.Attachments>
                ) : null}
                <PromptInput.TextArea placeholder='Ask about your files...' />
              </PromptInput.Content>
              <PromptInput.Toolbar>
                <PromptInput.ToolbarStart>
                  <ChatAttachmentInput.Trigger
                    render={(props) => (
                      <PromptInput.Action
                        {...props}
                        aria-label='Attach file'
                        tooltip='Attach file'
                      >
                        <HugeiconsIcon
                          aria-hidden
                          icon={Attachment01Icon}
                          strokeWidth={2}
                        />
                      </PromptInput.Action>
                    )}
                  />
                </PromptInput.ToolbarStart>
                <PromptInput.ToolbarEnd>
                  <PromptInput.Send aria-label='Send'>
                    <HugeiconsIcon
                      aria-hidden
                      icon={ArrowUp01Icon}
                      strokeWidth={2}
                    />
                  </PromptInput.Send>
                </PromptInput.ToolbarEnd>
              </PromptInput.Toolbar>
            </PromptInput.Shell>
          )}
        />
      </ChatAttachmentInput>
    </PromptInput>
  );
}
export const Composer: Story = { render: () => <ComposerDemo /> };
