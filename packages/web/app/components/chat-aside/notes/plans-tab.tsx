'use client';

import { Button, IconButton, Modal, Skeleton, toast } from '@aero/ui';
import {
  ArrowUpFromSquare,
  ChevronLeft,
  FileText,
  TrashBin,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useRef, useState } from 'react';

import { Markdown } from '@/app/components/markdown/markdown';
import {
  useCreateProjectPlan,
  useDeleteProjectPlan,
  useProjectPlan,
} from '@/app/hooks/api/project-context';
import { useI18n } from '@/app/hooks/i18n';
import type { AeroProjectPlan } from '@/server/services/harness/types';

const ACCEPTED_PLAN_TYPES = '.md,.markdown,.txt,text/markdown,text/plain';

export function PlansTab({
  workspaceId,
  plans,
}: {
  workspaceId: string;
  plans: AeroProjectPlan[];
}) {
  const { t } = useI18n();
  const createPlan = useCreateProjectPlan(workspaceId);
  const deletePlan = useDeleteProjectPlan(workspaceId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AeroProjectPlan | null>(
    null,
  );

  if (openPlanId) {
    return (
      <PlanReader
        workspaceId={workspaceId}
        planId={openPlanId}
        onBack={() => setOpenPlanId(null)}
      />
    );
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    try {
      const body = await file.text();
      const title = file.name.replace(/\.[^.]+$/, '');
      await createPlan.mutateAsync({ title, body });
    } catch {
      toast.danger(t.notesPanel.plans.importFailed);
    }
  };

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='border-separator flex shrink-0 items-center justify-between gap-2 border-b pl-3 pr-2 py-2'>
        <span className='text-muted min-w-0 truncate text-xs'>
          {t.notesPanel.plans.importHint}
        </span>
        <Button
          size='sm'
          variant='ghost'
          onPress={() => fileInputRef.current?.click()}
          isPending={createPlan.isPending}
          className='h-7 shrink-0 rounded-md px-2.5 text-xs'
        >
          <Icon data={ArrowUpFromSquare} className='size-3.5' />
          {t.notesPanel.plans.import}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type='file'
        accept={ACCEPTED_PLAN_TYPES}
        className='hidden'
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto p-1.5'>
        {plans.length === 0 ? (
          <div className='text-muted flex h-full items-center justify-center px-4 text-center text-sm'>
            {t.notesPanel.plans.empty}
          </div>
        ) : (
          plans.map((plan) => (
            <PlanRow
              key={plan.id}
              plan={plan}
              onOpen={() => setOpenPlanId(plan.id)}
              onDelete={() => setPendingDelete(plan)}
            />
          ))
        )}
      </div>

      <Modal
        isOpen={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              {({ close }) => (
                <>
                  <Modal.Header>{t.notesPanel.plans.deleteTitle}</Modal.Header>
                  <Modal.Body>
                    {pendingDelete
                      ? t.notesPanel.plans.deleteDescription(
                          pendingDelete.title,
                        )
                      : null}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='rounded-lg'
                      onPress={close}
                    >
                      {t.common.cancel}
                    </Button>
                    <Button
                      size='sm'
                      variant='danger'
                      className='rounded-lg'
                      isPending={deletePlan.isPending}
                      onPress={async () => {
                        if (!pendingDelete) return;
                        try {
                          await deletePlan.mutateAsync(pendingDelete.id);
                          toast.success(t.notesPanel.plans.deleted);
                        } catch {
                          toast.danger(t.notesPanel.plans.deleteFailed);
                        } finally {
                          setPendingDelete(null);
                          close();
                        }
                      }}
                    >
                      {t.common.delete}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

function PlanRow({
  plan,
  onOpen,
  onDelete,
}: {
  plan: AeroProjectPlan;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className='group hover:bg-surface-hover flex items-center gap-1 rounded-lg pr-1 pl-2'>
      <button
        type='button'
        onClick={onOpen}
        className='flex min-w-0 flex-1 items-center gap-2 py-2 text-left'
      >
        <Icon data={FileText} size={16} className='text-muted shrink-0' />
        <span className='flex min-w-0 flex-col'>
          <span className='text-foreground truncate text-sm'>{plan.title}</span>
          <span className='text-muted text-xs'>
            {new Date(plan.updatedAt).toLocaleDateString()}
          </span>
        </span>
      </button>

      <IconButton
        aria-label={t.notesPanel.plans.delete}
        onPress={onDelete}
        className='shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100'
      >
        <Icon data={TrashBin} />
      </IconButton>
    </div>
  );
}

function PlanReader({
  workspaceId,
  planId,
  onBack,
}: {
  workspaceId: string;
  planId: string;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const { data, isLoading } = useProjectPlan(workspaceId, planId);

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='border-separator flex shrink-0 items-center gap-1.5 border-b px-2 py-1.5'>
        <IconButton aria-label={t.notesPanel.plans.back} onPress={onBack}>
          <Icon data={ChevronLeft} />
        </IconButton>
        <span className='text-foreground min-w-0 flex-1 truncate text-xs font-medium'>
          {data?.plan.title ?? ''}
        </span>
      </div>

      <div className='min-h-0 flex-1 overflow-hidden'>
        {isLoading ? (
          <div className='space-y-2 p-3'>
            <Skeleton className='h-6 w-2/3 rounded' />
            <Skeleton className='h-4 w-full rounded' />
            <Skeleton className='h-4 w-5/6 rounded' />
          </div>
        ) : data ? (
          <div className='scrollbar-thin h-full overflow-y-auto px-4 py-3'>
            <Markdown
              id={`project-plan:${planId}`}
              className='text-sm'
              streamRevealPreset='off'
            >
              {data.content}
            </Markdown>
          </div>
        ) : (
          <div className='text-muted flex h-full items-center justify-center px-4 text-center text-sm'>
            {t.notesPanel.plans.readFailed}
          </div>
        )}
      </div>
    </div>
  );
}
