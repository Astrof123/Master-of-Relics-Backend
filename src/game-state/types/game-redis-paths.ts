export const GAMEPATH  = {
    getPlayerConnectionPath: (userId: number) => `.players.${userId}.connection`,
    getPlayersPath: () => `.players`,
    getPlayerReadyPath: (userId: number) => `.players.${userId}.isReady`,
    getArtifactsPath: (userId: number) => `.players.${userId}.artifacts`,
    getPhasePath: () => `.phase`,
};
