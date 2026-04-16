import { HttpException, HttpStatus } from '@nestjs/common';
import { CustomHttpException } from 'src/common/custom-http.exception';

export class UserNotFoundException extends CustomHttpException {
    constructor() {
        super('Пользователь не найден', HttpStatus.NOT_FOUND);
    }
}
