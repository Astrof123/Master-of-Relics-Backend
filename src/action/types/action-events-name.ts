export const ACTION_EVENT_NAME  = {
    USE_FACE: 'use_face',
    END_TURN: 'end_turn',
    END_ROUND: 'end_round',
    ANIMATION: "animation",
    EXTRA_ACTION: "extra_action",
    USE_SPELL: "use_spell",
    USE_SKILL: "use_skill",
    TOGGLE_READY_MOVEMENT: "toggle_ready_movement",
    MOVE_ARTIFACT: "toggle_ready_movement"
};

export type GameEventName  = typeof ACTION_EVENT_NAME [keyof typeof ACTION_EVENT_NAME];