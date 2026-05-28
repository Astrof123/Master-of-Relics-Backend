import { HttpException, HttpStatus } from '@nestjs/common';
import { CustomHttpException } from 'src/common/custom-http.exception';

export class DeckNotFoundException extends CustomHttpException {
    constructor() {
        super('Колода не найдена', HttpStatus.NOT_FOUND);
    }
}

export class InvalidNewDeckException extends CustomHttpException {
    constructor() {
        super('Неверные данные о новой колоде', HttpStatus.BAD_REQUEST);
    }
}
