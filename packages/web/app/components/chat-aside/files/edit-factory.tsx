import { Editor, EditorOptions, EditorType } from '@pierre/diffs/edit';

export function createEditor<EType extends EditorType, LAnnotation, Caret>(
  editorType: EType,
  options: EditorOptions<EType, LAnnotation, Caret>,
  editStateKey?: string,
): Editor<EType, LAnnotation, Caret> {
  return new Editor(editorType, options, editStateKey);
}
