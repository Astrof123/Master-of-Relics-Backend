import { HttpException, HttpStatus } from '@nestjs/common';

export class CustomException extends HttpException {
    constructor(errorText: string, status: HttpStatus) {
        super(errorText, status);
    }
}