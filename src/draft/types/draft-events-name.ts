export const DRAFT_EVENT_NAME  = {
    PICK_ARTIFACT: 'pick_artifact',
    TOGGLE_READY_DRAFT: "toggle_ready_draft"
};

export type DraftEventName  = typeof DRAFT_EVENT_NAME [keyof typeof DRAFT_EVENT_NAME];