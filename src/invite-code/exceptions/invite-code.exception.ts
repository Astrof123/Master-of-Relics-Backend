import { HttpException, HttpStatus } from '@nestjs/common';
import { CustomHttpException } from 'src/common/custom-http.exception';

export class InviteCodeNotFoundException extends CustomHttpException {
    constructor() {
        super('Инвайт код не найден', HttpStatus.NOT_FOUND);
    }
}