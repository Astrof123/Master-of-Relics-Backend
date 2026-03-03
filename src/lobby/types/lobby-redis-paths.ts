export const LOBBYPATH  = {
    getHostPath: (userId: number) => `.players.${userId}.isHost`,
    getPlayersPath: () => `.players`,
    getPlayerReadyPath: (userId: number) => `.players.${userId}.isReady`,
    getStatePath: () => `.state`,
    getPlayerPath: (userId: number) => `.players.${userId}`
};
