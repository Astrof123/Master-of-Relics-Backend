export const DRAFTPATH  = {
    getPickedArtifact: (userId: number) => `.players.${userId}.draft.pickedArtifact`,
    getArtifactPath: (userId: number, artifactId: string) => `.players.${userId}.artifacts.${artifactId}`,
};