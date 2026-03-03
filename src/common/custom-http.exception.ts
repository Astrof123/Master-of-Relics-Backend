import { HttpException, HttpStatus } from '@nestjs/common';

export class CustomHttpException extends HttpException {
    constructor(errorText: string, status: HttpStatus) {
        super(errorText, status);
    }
}