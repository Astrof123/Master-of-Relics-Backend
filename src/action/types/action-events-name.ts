export const ACTION_EVENT_NAME  = {
    USE_FACE: 'use_face',
    END_TURN: 'end_turn',
    END_ROUND: 'end_round',
    ANIMATION: "animation",
    EXTRA_ACTION: "extra_action",
    USE_SKILL: "use_skill"
};

export type GameEventName  = typeof ACTION_EVENT_NAME [keyof typeof ACTION_EVENT_NAME];