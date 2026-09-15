import { Editor } from '@pierre/diffs/edit';

export function createEditor(
  editorType: any,
  options?: any,
  editStateKey?: string,
) {
  return new Editor(editorType, options ?? {}, editStateKey);
}
