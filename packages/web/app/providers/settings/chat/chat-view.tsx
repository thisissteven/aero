// chat-view.tsx
import { Checkbox, Separator, Typography } from '@aero/ui';

import { useSessionGoalEnabled } from '@/app/hooks/api/session-goal';
import { useUpdateSetting } from '@/app/hooks/api/settings';
import { useI18n } from '@/app/hooks/i18n';

export function ChatView() {
  const { t } = useI18n();
  const goalEnabled = useSessionGoalEnabled();
  const { mutate } = useUpdateSetting();

  return (
    <div className='bg-background max-w-4xl flex-1 scrollbar-thin space-y-8 overflow-y-auto p-8'>
      <div>
        <Typography type='h3' weight='semibold'>
          {t.settingsChat.title}
        </Typography>
        <Typography type='body-sm' color='muted'>
          {t.settingsChat.subtitle}
        </Typography>
      </div>

      <Separator />

      <section className='space-y-4'>
        <Typography type='h6'>{t.settingsChat.goalSection}</Typography>

        <div className='flex items-center gap-2'>
          <Checkbox
            isSelected={goalEnabled}
            onChange={(selected) =>
              mutate({ path: ['sessionGoalEnabled'], value: selected })
            }
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              {t.settingsChat.goalEnabled}
            </Checkbox.Content>
          </Checkbox>
        </div>

        <Typography type='body-sm' color='muted'>
          {t.settingsChat.goalDescription}
        </Typography>
      </section>
    </div>
  );
}
