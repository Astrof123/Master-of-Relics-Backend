export const LOBBYPATH  = {
    getHostPath: (userId: string) => `.players.${userId}.isHost`,
    getPlayersPath: () => `.players`,
    getPlayerReadyPath: (userId: string) => `.players.${userId}.isReady`,
    getStatePath: () => `.state`,
    getPlayerPath: (userId: string) => `.players.${userId}`
};
