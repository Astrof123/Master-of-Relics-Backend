export class CustomException extends Error {
    public code: number;

    constructor(
        message: string,
        codeError: number
    ) {
        super(message);
        this.code = codeError;
    }
}